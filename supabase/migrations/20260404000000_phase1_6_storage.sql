-- ============================================================
-- Phase 1.6 — Supabase Storage: medical-certificates bucket
-- ============================================================

-- Create the bucket (private, 10 MB limit, images + PDF only)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-certificates',
  'medical-certificates',
  false,
  10485760,
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- RLS Policies on storage.objects
-- File path convention: {user_id}/{filename}
-- ============================================================

-- SELECT: uploader OR their department manager OR Admin
-- Uses owner column (set by Supabase on upload) to avoid column-name
-- ambiguity when the subquery joins departments (which also has a name col)
CREATE POLICY "mc_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'medical-certificates'
  AND (
    owner = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      JOIN public.departments d ON d.id = u.department_id
      WHERE u.id = owner
        AND d.manager_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  )
);

-- INSERT: only the uploader (path must start with their uid)
CREATE POLICY "mc_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'medical-certificates'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- UPDATE: uploader or Admin
CREATE POLICY "mc_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'medical-certificates'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  )
)
WITH CHECK (
  bucket_id = 'medical-certificates'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  )
);

-- DELETE: uploader or Admin
CREATE POLICY "mc_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'medical-certificates'
  AND (
    auth.uid()::text = (storage.foldername(name))[1]
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE id = auth.uid() AND role = 'Admin'
    )
  )
);
