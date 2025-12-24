import IconBuildingPermit from './BrandBuildingPermit';
import IconContractAdvisory from './BrandContractAdvisory';
import IconCorporateBusiness from './BrandCorporateBusiness';

export function ServicesIcon({ name, className }: { name: string; className: string }) {
  switch (name) {
    case 'IconCorporateBusiness':
      return <IconCorporateBusiness className={className} />;
    case 'IconContractAdvisory':
      return <IconContractAdvisory className={className} />;
    case 'IconBuildingPermit':
      return <IconBuildingPermit className={className} />;
  }
}
