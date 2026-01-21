import IconBuildingPermit from './legal/BrandBuildingPermit';
import IconContractAdvisory from './legal/BrandContractAdvisory';
import IconCorporateBusiness from './legal/BrandCorporateBusiness';
import BrandIconBuildingPermit from './real-estate/BrandIconBuildingPermit';
import BrandIconEPO from './visa/BrandIconEPO';
import BrandIconImmigration from './visa/BrandIconImmigration';
import BrandIconKitap from './visa/BrandIconKitap';
import BrandIconKitas from './visa/BrandIconKitas';
import BrandIconTSP from './visa/BrandIconTSP';
import BrandIconVisa from './visa/BrandIconVisa';
import BrandIconPropertyDiligence from './real-estate/BrandIconPropertyDiligence';
import BrandIconTransactionAgreement from './real-estate/BrandIconTransactionAgreement';

export function ServicesIcon({ name, className }: { name: string; className: string }) {
  switch (name) {
    case 'IconCorporateBusiness':
      return <IconCorporateBusiness className={className} />;
    case 'IconContractAdvisory':
      return <IconContractAdvisory className={className} />;
    case 'IconBuildingPermit':
      return <IconBuildingPermit className={className} />;
    case 'BrandIconEPO':
      return <BrandIconEPO className={className} />;
    case 'BrandIconImmigration':
      return <BrandIconImmigration className={className} />;
    case 'BrandIconKitap':
      return <BrandIconKitap className={className} />;
    case 'BrandIconKitas':
      return <BrandIconKitas className={className} />;
    case 'BrandIconTSP':
      return <BrandIconTSP className={className} />;
    case 'BrandIconVisa':
      return <BrandIconVisa className={className} />;
    case 'BrandIconBuildingPermit':
      return <BrandIconBuildingPermit className={className} />;
    case 'BrandIconPropertyDiligence':
      return <BrandIconPropertyDiligence className={className} />;
    case 'BrandIconTransactionAgreement':
      return <BrandIconTransactionAgreement className={className} />;
  }
}
