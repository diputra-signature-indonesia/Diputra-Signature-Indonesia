import type { ServiceIconKey } from '@/types/dsi-services';
import IconLawBuilding from '@/icons/BrandIconLawBuilding';
import IconVisaLaw from '@/icons/BrandIconVisaLaw';
import IconTwoBuilding from '@/icons/BrandIconTwoBuilding';

export const SERVICE_ICONS: Record<ServiceIconKey, React.ElementType> = {
  law: IconLawBuilding,
  visa: IconVisaLaw,
  realestate: IconTwoBuilding,
};

export function getServiceIcon(key: ServiceIconKey | null | undefined) {
  const k: ServiceIconKey = key ?? 'law';
  return SERVICE_ICONS[k];
}
