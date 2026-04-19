-- Creates or resets the admin login user expected by this project.
-- Temporary password: lwmacct@icloud.com
-- Safe to run multiple times.

do $$
declare
  target_email constant text := 'lwmacct@icloud.com';
  target_password constant text := 'lwmacct@icloud.com';
  target_user_id uuid;
begin
  select users.id
  into target_user_id
  from auth.users users
  where lower(users.email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    target_user_id := gen_random_uuid();

    insert into auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    values (
      '00000000-0000-0000-0000-000000000000',
      target_user_id,
      'authenticated',
      'authenticated',
      target_email,
      crypt(target_password, gen_salt('bf')),
      timezone('utc', now()),
      '{"provider":"email","providers":["email"]}'::jsonb,
      jsonb_build_object('display_name', 'lwmacct'),
      timezone('utc', now()),
      timezone('utc', now()),
      '',
      '',
      '',
      ''
    );
  else
    update auth.users
    set
      encrypted_password = crypt(target_password, gen_salt('bf')),
      email_confirmed_at = coalesce(email_confirmed_at, timezone('utc', now())),
      raw_app_meta_data = '{"provider":"email","providers":["email"]}'::jsonb,
      raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || jsonb_build_object('display_name', 'lwmacct'),
      updated_at = timezone('utc', now())
    where id = target_user_id;
  end if;

  insert into auth.identities (
    user_id,
    provider_id,
    identity_data,
    provider,
    last_sign_in_at,
    created_at,
    updated_at
  )
  values (
    target_user_id,
    target_user_id::text,
    jsonb_build_object(
      'sub',
      target_user_id::text,
      'email',
      target_email,
      'email_verified',
      true
    ),
    'email',
    timezone('utc', now()),
    timezone('utc', now()),
    timezone('utc', now())
  )
  on conflict do nothing;
end
$$;
