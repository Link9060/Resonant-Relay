'use client';

import { createClient } from '@/lib/supabase/client';

export type RelayFieldNode = {
  id: string;
  user_id: string;
  type: string;
  title: string;
  searchable_text: string | null;
  source_product: string;
  source_id: string;
  source_type: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};

export type RelayFieldEdge = {
  id: string;
  user_id: string;
  source_node_id: string;
  target_node_id: string;
  relation_type: string;
  strength: number;
  origin: string;
  metadata: Record<string, unknown>;
};

export type RelayFieldBundle = {
  node: RelayFieldNode;
  content: any | null;
  file: any | null;
  previewUrl: string | null;
};

export async function loadFieldGraph() {
  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const [nodeResult, edgeResult] = await Promise.all([
    supabase
      .from('field_nodes')
      .select('id,user_id,type,title,searchable_text,source_product,source_id,source_type,metadata,created_at,updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(500),
    supabase
      .from('field_edges')
      .select('*')
      .eq('user_id', user.id)
      .order('strength', { ascending: false })
      .limit(1000),
  ]);

  if (nodeResult.error) throw nodeResult.error;
  if (edgeResult.error) throw edgeResult.error;

  return {
    userId: user.id,
    nodes: (nodeResult.data ?? []) as RelayFieldNode[],
    edges: (edgeResult.data ?? []) as RelayFieldEdge[],
  };
}

export async function loadFieldNodeBundle(node: RelayFieldNode): Promise<RelayFieldBundle> {
  const supabase = createClient() as any;

  const [contentResult, fileResult] = await Promise.all([
    supabase.from('field_node_content').select('*').eq('node_id', node.id).maybeSingle(),
    supabase.from('field_files').select('*').eq('node_id', node.id).maybeSingle(),
  ]);

  if (contentResult.error) throw contentResult.error;
  if (fileResult.error) throw fileResult.error;

  const content = contentResult.data ?? null;
  const file = fileResult.data ?? null;
  const bucket = content?.preview_bucket_id ?? file?.bucket_id ?? null;
  const objectPath = content?.preview_object_path
    ?? (String(file?.mime_type ?? '').startsWith('image/') ? file?.object_path : null);

  let previewUrl: string | null = null;
  if (bucket && objectPath) {
    const { data, error } = await supabase.storage.from(bucket).createSignedUrl(objectPath, 300);
    if (error) throw error;
    previewUrl = data?.signedUrl ?? null;
  }

  return { node, content, file, previewUrl };
}

export async function uploadFieldFile(file: File) {
  if (file.size > 52_428_800) throw new Error('Field files must be 50 MB or smaller.');

  const supabase = createClient() as any;
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Not signed in.');

  const sourceId = crypto.randomUUID();
  const fileName = sanitizeFileName(file.name);
  const objectPath = `${user.id}/${sourceId}/${fileName}`;
  const mimeType = file.type || inferMimeType(fileName);
  const isImage = mimeType.startsWith('image/');
  const canReadText = isReadableText(mimeType, fileName) && file.size <= 2_000_000;

  let extractedText: string | null = null;
  if (canReadText) {
    extractedText = (await file.text()).slice(0, 250_000);
  }

  const { error: uploadError } = await supabase.storage
    .from('field-files')
    .upload(objectPath, file, { contentType: mimeType, upsert: false });
  if (uploadError) throw uploadError;

  let nodeId: string | null = null;
  try {
    const { data: node, error: nodeError } = await supabase
      .from('field_nodes')
      .insert({
        user_id: user.id,
        type: 'file',
        title: file.name.slice(0, 240),
        searchable_text: extractedText || file.name,
        source_product: 'relay',
        source_id: sourceId,
        source_type: isImage ? 'image' : 'file',
        metadata: {
          file_name: file.name,
          mime_type: mimeType,
          size_bytes: file.size,
        },
      })
      .select('*')
      .single();

    if (nodeError || !node) throw nodeError ?? new Error('Field node could not be created.');
    nodeId = node.id;

    const [{ error: fileError }, { error: contentError }, { error: preferenceError }] = await Promise.all([
      supabase.from('field_files').insert({
        user_id: user.id,
        node_id: node.id,
        bucket_id: 'field-files',
        object_path: objectPath,
        file_name: file.name,
        mime_type: mimeType,
        size_bytes: file.size,
        extraction_status: isImage || extractedText ? 'ready' : 'pending',
      }),
      supabase.from('field_node_content').insert({
        node_id: node.id,
        user_id: user.id,
        content_kind: isImage ? 'image' : extractedText ? 'text' : 'file',
        text_content: extractedText,
        structured_content: {
          file_name: file.name,
          size_bytes: file.size,
        },
        mime_type: mimeType,
        preview_bucket_id: isImage ? 'field-files' : null,
        preview_object_path: isImage ? objectPath : null,
        preview_alt: isImage ? file.name : null,
      }),
      supabase.from('field_source_preferences').upsert({
        user_id: user.id,
        source_product: 'relay',
        source_type: isImage ? 'image' : 'file',
        indexed: true,
        ravin_read: true,
        external_ai_read: false,
        allow_writeback: false,
      }, { onConflict: 'user_id,source_product,source_type' }),
    ]);

    if (fileError) throw fileError;
    if (contentError) throw contentError;
    if (preferenceError) throw preferenceError;

    return node as RelayFieldNode;
  } catch (error) {
    if (nodeId) {
      await supabase.from('field_nodes').delete().eq('id', nodeId).eq('user_id', user.id);
    }
    await supabase.storage.from('field-files').remove([objectPath]);
    throw error;
  }
}

function sanitizeFileName(value: string) {
  const trimmed = value.trim().slice(0, 180) || 'file';
  return trimmed.replace(/[^a-zA-Z0-9._ -]/g, '_');
}

function inferMimeType(fileName: string) {
  const ext = fileName.toLowerCase().split('.').pop();
  if (ext === 'md' || ext === 'txt') return 'text/plain';
  if (ext === 'json') return 'application/json';
  if (ext === 'csv') return 'text/csv';
  if (ext === 'png') return 'image/png';
  if (ext === 'jpg' || ext === 'jpeg') return 'image/jpeg';
  if (ext === 'webp') return 'image/webp';
  if (ext === 'gif') return 'image/gif';
  if (ext === 'pdf') return 'application/pdf';
  return 'application/octet-stream';
}

function isReadableText(mimeType: string, fileName: string) {
  return mimeType.startsWith('text/')
    || mimeType === 'application/json'
    || /\.(md|txt|json|csv)$/i.test(fileName);
}
