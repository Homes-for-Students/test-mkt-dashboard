const fs = require('fs');
const path = './client/src/components/ChannelBreakdown.tsx';
let code = fs.readFileSync(path, 'utf8');

const layoutStart = code.indexOf('<div className="grid grid-cols-1">\n        <WebsiteSnapshot');
const endMarker = '    </div>\n  );\n}';
const layoutEnd = code.indexOf(endMarker);

const topCode = code.substring(0, layoutStart);
const bottomCode = code.substring(layoutEnd);
const layoutCode = code.substring(layoutStart, layoutEnd);

const extractBlock = (startStr, endStr) => {
  const start = layoutCode.indexOf(startStr);
  const end = layoutCode.indexOf(endStr, start) + endStr.length;
  return layoutCode.substring(start, end);
};

const websiteSnapshotBlock = extractBlock('<WebsiteSnapshot', '/>\n');
const channelCardsBlock = extractBlock('{/* Channel-Specific Performance Cards */}', '</div>\n\n      {/* Visual Analytics Grid */}').replace('</div>\n\n      {/* Visual Analytics Grid */}', '').trim();
const aiTrafficBlock = extractBlock('{/* AI Traffic Overview replacing Ad Networks Performance */}', '</div>\n\n        {/* Paid Ad Budget Allocation */}').replace('</div>\n\n        {/* Paid Ad Budget Allocation */}', '</div>').trim();
const paidBudgetBlock = extractBlock('{/* Paid Ad Budget Allocation */}', '</Card>\n      </div>').replace('</Card>\n      </div>', '</Card>').trim();
const searchConsoleBlock = extractBlock('<SearchConsoleTable', '/>\n');

const newLayout = `
      {/* 1. ORGANIC / INBOUND STORY */}
      <div className="grid grid-cols-1 gap-6 mb-6">
        ${websiteSnapshotBlock.trim()}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-5 gap-6 mb-8">
        <div className="xl:col-span-3 h-full">
          ${searchConsoleBlock.trim()}
        </div>
        <div className="xl:col-span-2 h-full">
          ${aiTrafficBlock.replace('bg-white rounded-lg border border-slate-200 p-5 h-full shadow-[0_8px_30px_rgb(0,0,0,0.015)]', 'bg-white rounded-2xl border border-slate-100/80 p-5 h-full shadow-[0_8px_30px_rgb(0,0,0,0.015)]').replace('text-sm font-semibold text-slate-900', 'text-sm font-bold text-slate-900').split('\\n').join('\\n          ')}
        </div>
      </div>

      {/* 2. PAID / LOCAL STORY */}
      <div className="mb-6">
        ${channelCardsBlock.split('\\n').join('\\n        ')}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-4">
        <div className="lg:col-span-1">
          ${paidBudgetBlock.split('\\n').join('\\n          ')}
        </div>
      </div>
`;

fs.writeFileSync(path, topCode + newLayout.replace(/\\n/g, '\n') + '\n' + bottomCode);
