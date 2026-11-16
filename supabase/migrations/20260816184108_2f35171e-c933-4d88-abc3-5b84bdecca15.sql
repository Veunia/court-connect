INSERT INTO public.spaces (id, name, description, invite_code, invite_code_active, created_by)
VALUES ('a3b5b64b-b59e-4bfb-a30f-97c3c4652a39', 'Club Test', NULL, public.generate_invite_code(), true,
        (SELECT id FROM auth.users WHERE email = 'fred@basket.app'))
ON CONFLICT (id) DO NOTHING;