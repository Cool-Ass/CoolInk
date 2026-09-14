-- Supabase Storage is optional in local PostgreSQL installations. When it is
-- available, keep project inspirations private and constrain every client to
-- the top-level folder named after auth.uid(). Service-role server requests
-- continue to bypass RLS for studio administration and account deletion.
DO $$
BEGIN
  IF to_regclass('storage.buckets') IS NOT NULL AND to_regclass('storage.objects') IS NOT NULL THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'project-inspirations',
      'project-inspirations',
      false,
      20971520,
      ARRAY['image/jpeg', 'image/png', 'image/webp']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = false,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;

    EXECUTE 'DROP POLICY IF EXISTS "coolink_project_inspiration_owner_guard" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "coolink_project_inspiration_anon_guard" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "coolink_project_inspiration_owner_select" ON storage.objects';
    EXECUTE 'DROP POLICY IF EXISTS "coolink_project_inspiration_owner_insert" ON storage.objects';

    EXECUTE $policy$
      CREATE POLICY "coolink_project_inspiration_owner_guard"
      ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
      USING (
        bucket_id <> 'project-inspirations'
        OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
      )
      WITH CHECK (
        bucket_id <> 'project-inspirations'
        OR (storage.foldername(name))[1] = (SELECT auth.uid()::text)
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "coolink_project_inspiration_anon_guard"
      ON storage.objects AS RESTRICTIVE FOR ALL TO anon
      USING (bucket_id <> 'project-inspirations')
      WITH CHECK (bucket_id <> 'project-inspirations')
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "coolink_project_inspiration_owner_select"
      ON storage.objects FOR SELECT TO authenticated
      USING (
        bucket_id = 'project-inspirations'
        AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
      )
    $policy$;

    EXECUTE $policy$
      CREATE POLICY "coolink_project_inspiration_owner_insert"
      ON storage.objects FOR INSERT TO authenticated
      WITH CHECK (
        bucket_id = 'project-inspirations'
        AND (storage.foldername(name))[1] = (SELECT auth.uid()::text)
      )
    $policy$;
  END IF;
END
$$;
