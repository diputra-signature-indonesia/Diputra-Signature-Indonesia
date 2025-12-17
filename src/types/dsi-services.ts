import { SERVICES_CATEGORY } from '@/data/dsi-services';

export type Category = keyof typeof SERVICES_CATEGORY;

export type ServiceItem = (typeof SERVICES_CATEGORY)[Category]['services'][number];

export type ServiceDetail = ServiceItem['services_detail'][number];
