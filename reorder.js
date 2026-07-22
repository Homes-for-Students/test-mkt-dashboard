const fs = require('fs');
const path = './client/src/components/ChannelBreakdown.tsx';
let code = fs.readFileSync(path, 'utf8');

// Find the start of the layout section
const layoutStart = code.indexOf('<div className="grid grid-cols-1">\n        <WebsiteSnapshot');

// We know the end is near the bottom
const endMarker = '    </div>\n  );\n}';
const layoutEnd = code.indexOf(endMarker);

const topCode = code.substring(0, layoutStart);
const bottomCode = code.substring(layoutEnd);
const layoutCode = code.substring(layoutStart, layoutEnd);

// Extract components from layoutCode
const extractBlock = (startStr, endStr) => {
  const start = layoutCode.indexOf(startStr);
  const end = layoutCode.indexOf(endStr, start) + endStr.length;
  return layoutCode.substring(start, end);
};

const websiteSnapshotBlock = extractBlock('<div className="grid grid-cols-1">\n        <WebsiteSnapshot', '/>\n      </div>');
const channelCardsBlock = extractBlock('{/* Channel-Specific Performance Cards */}', '</div>\n\n      {/* Visual Analytics Grid */}').replace('</div>\n\n      {/* Visual Analytics Grid */}', '').trim();
const aiTrafficBlock = extractBlock('{/* AI Traffic Overview replacing Ad Networks Performance */}', '</div>\n\n        {/* Paid Ad Budget Allocation */}').replace('</div>\n\n        {/* Paid Ad Budget Allocation */}', '</div>').trim();
const paidBudgetBlock = extractBlock('{/* Paid Ad Budget Allocation */}', '</Card>\n      </div>').replace('</Card>\n      </div>', '</Card>').trim();
const searchConsoleBlock = extractBlock('<div className="grid grid-cols-1">\n        <div className="h-full">\n          <SearchConsoleTable', '/>\n        </div>\n      </div>');

const newLayout = `
      {/* 1. ORGANIC / INBOUND STORY */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        <WebsiteSnapshot 
          selectedCity={selectedCity}
          selectedPropertyIds={selectedPropertyIds}
          selectedBrand={selectedBrand}
          dateRange={dateRange}
        />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-10">
        <div className="xl:col-span-3 h-full">
          <SearchConsoleTable 
            limit={5} 
            showSearch={false} 
            compact={true} 
            hideTitle={true}
            selectedCity={selectedCity}
            selectedPropertyIds={selectedPropertyIds}
            selectedBrand={selectedBrand}
            dateRange={dateRange}
          />
        </div>
        <div className="xl:col-span-2 h-full">
${aiTrafficBlock.replace('bg-white rounded-lg border border-slate-200 p-5 h-full shadow-[0_8px_30px_rgb(0,0,0,0.015)]', 'bg-white rounded-2xl border border-slate-100/80 p-5 h-full shadow-[0_8px_30px_rgb(0,0,0,0.015)]').replace('text-sm font-semibold text-slate-900', 'text-sm font-bold text-slate-900').split('\\n').map(l => '          ' + l).join('\\n')}
        </div>
      </div>

      {/* 2. PAID / LOCAL STORY */}
      <div className="mb-6">
        ${channelCardsBlock}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
        <div className="lg:col-span-1">
${paidBudgetBlock.split('\\n').map(l => '          ' + l).join('\\n')}
        </div>
      </div>
`;

// wait, AI traffic replace split mapping might have issues with \n if it's literal. We use \n in split.
fs.writeFileSync(path, topCode + newLayout.replace(/\\n/g, '\n') + '\n' + bottomCode);
