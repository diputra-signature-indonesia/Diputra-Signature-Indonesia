export type SopFile = {
  id: string;
  title: string;
  originalFilename: string;
  fileType: 'FLOW' | 'REQUIREMENT';
  mimeType: string;
  sizeBytes: number;
  sortOrder: number;
  uploadedAt: string;
  version: number;
  signedUrl: string | null;
  driveUrl: string | null;
};

export type SopPriceItem = {
  id: string;
  itemName: string;
  amount: number;
  notes: string | null;
  sortOrder: number;
};

export type SopRecord = {
  id: string;
  description: string | null;
  version: number;
  flow: SopFile | null;
  requirementFiles: SopFile[];
  priceItems: SopPriceItem[];
};

export type SopService = {
  id: string;
  title: string;
  summary: string;
  sop: SopRecord | null;
};

export type SopWorkspaceData = {
  canManage: boolean;
  services: SopService[];
};
