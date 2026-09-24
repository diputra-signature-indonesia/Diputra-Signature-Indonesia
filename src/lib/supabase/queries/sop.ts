import 'server-only';

import { requireActiveAdmin } from '@/lib/auth/admin-access';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { SopFile, SopWorkspaceData } from '@/types/admin-sop';

export async function getSopWorkspaceData(): Promise<SopWorkspaceData> {
  const actor = await requireActiveAdmin();
  const supabase = await createSupabaseServerClient();
  const canManage = actor.role === 'admin' || actor.role === 'super_admin';

  const [servicesResult, sopsResult] = await Promise.all([
    supabase.from('internal_services').select('id,name,summary').eq('is_active', true).order('name'),
    supabase.from('sops').select('id,internal_service_id,description,version'),
  ]);
  if (servicesResult.error) throw new Error(`Unable to load SOP services: ${servicesResult.error.message}`);
  if (sopsResult.error) throw new Error(`Unable to load SOP records: ${sopsResult.error.message}`);

  const sops = sopsResult.data ?? [];
  const sopIds = sops.map((sop) => sop.id);
  const [filesResult, pricesResult] = sopIds.length ? await Promise.all([
    supabase.from('sop_files')
      .select('id,sop_id,file_type,title,original_filename,bucket_id,storage_path,mime_type,size_bytes,sort_order,uploaded_at,version')
      .in('sop_id', sopIds).eq('upload_status', 'READY').is('deleted_at', null).order('sort_order').order('id'),
    supabase.from('sop_price_items')
      .select('id,sop_id,item_name,amount,notes,sort_order').in('sop_id', sopIds).order('sort_order').order('id'),
  ]) : [{ data: [], error: null }, { data: [], error: null }];
  if (filesResult.error) throw new Error(`Unable to load SOP files: ${filesResult.error.message}`);
  if (pricesResult.error) throw new Error(`Unable to load SOP prices: ${pricesResult.error.message}`);

  const files = await Promise.all((filesResult.data ?? []).map(async (file): Promise<SopFile & { sopId: string }> => {
    const { data } = await supabase.storage.from(file.bucket_id).createSignedUrl(file.storage_path, 3600);
    return {
      id: file.id,
      sopId: file.sop_id,
      title: file.title,
      originalFilename: file.original_filename,
      fileType: file.file_type as SopFile['fileType'],
      mimeType: file.mime_type,
      sizeBytes: file.size_bytes,
      sortOrder: file.sort_order,
      uploadedAt: file.uploaded_at ?? '',
      version: file.version,
      signedUrl: data?.signedUrl ?? null,
    };
  }));
  const filesBySop = new Map<string, typeof files>();
  for (const file of files) filesBySop.set(file.sopId, [...(filesBySop.get(file.sopId) ?? []), file]);
  const pricesBySop = new Map<string, NonNullable<typeof pricesResult.data>>();
  for (const price of pricesResult.data ?? []) pricesBySop.set(price.sop_id, [...(pricesBySop.get(price.sop_id) ?? []), price]);
  const sopByService = new Map(sops.map((sop) => [sop.internal_service_id, sop]));

  return {
    canManage,
    services: (servicesResult.data ?? []).map((service) => {
      const sop = sopByService.get(service.id);
      const sopFiles = sop ? filesBySop.get(sop.id) ?? [] : [];
      return {
        id: service.id,
        title: service.name,
        summary: service.summary ?? 'Internal service procedure.',
        sop: sop ? {
          id: sop.id,
          description: sop.description,
          version: sop.version,
          flow: sopFiles.find((file) => file.fileType === 'FLOW') ?? null,
          requirementFiles: sopFiles.filter((file) => file.fileType === 'REQUIREMENT'),
          priceItems: (pricesBySop.get(sop.id) ?? []).map((item) => ({
            id: item.id,
            itemName: item.item_name,
            amount: Number(item.amount),
            notes: item.notes,
            sortOrder: item.sort_order,
          })),
        } : null,
      };
    }),
  };
}
