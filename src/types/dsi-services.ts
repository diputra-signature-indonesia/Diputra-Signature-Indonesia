import { SERVICES_CATEGORY } from '@/data/dsi-services';

export type Category = keyof typeof SERVICES_CATEGORY;

export type ServiceItem = (typeof SERVICES_CATEGORY)[Category]['services'][number];
