DROP POLICY IF EXISTS avatars_read_authenticated ON storage.objects;

CREATE POLICY avatars_read_shared_space
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'avatars'
  AND (
    (storage.foldername(name))[1] = (auth.uid())::text
    OR public.shares_space_with(((storage.foldername(name))[1])::uuid)
  )
);