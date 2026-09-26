import type { ServiceIconKey } from '@/types/dsi-services';
import IconLawBuilding from '@/icons/BrandIconLawBuilding';
import IconVisaLaw from '@/icons/BrandIconVisaLaw';
import IconTwoBuilding from '@/icons/BrandIconTwoBuilding';

export const SERVICE_ICONS: Record<ServiceIconKey, React.ElementType> = {
  law: IconLawBuilding,
  visa: IconVisaLaw,
  realestate: IconTwoBuilding,
};

export function getServiceIcon(key: string | null | undefined) {
  if (key && key in SERVICE_ICONS) return SERVICE_ICONS[key as ServiceIconKey];
  return SERVICE_ICONS.law;
}
