import { useMemo } from 'react';
import { trpc } from '../lib/trpc';
import { getBrandBadgeClass } from '../pages/PropertyManagement';

export default function GlobalBrandStyles() {
  const { data: brandColors = {} } = trpc.brandColors.getAll.useQuery();

  const styles = useMemo(() => {
    return Object.values(brandColors)
      .map(
        (color) => `
      .${getBrandBadgeClass(color.brand)} {
        background-color: ${color.backgroundColor} !important;
        color: ${color.textColor} !important;
      }
    `
      )
      .join('\n');
  }, [brandColors]);

  if (!styles) return null;

  return <style dangerouslySetInnerHTML={{ __html: styles }} />;
}
