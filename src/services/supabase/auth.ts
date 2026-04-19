import { getAuthRedirectUrl, getSupabaseClient } from "./client";

export async function signInWithEmailPassword(
  email: string,
  password: string,
) {
  const client = getSupabaseClient();
  const { error } = await client.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function signUpWithEmailPassword(
  email: string,
  password: string,
) {
  const client = getSupabaseClient();
  const { data, error } = await client.auth.signUp({
    email: email.trim(),
    password,
    options: {
      emailRedirectTo: getAuthRedirectUrl(),
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    emailConfirmationRequired: !data.session,
  };
}

export async function signOutCurrentUser() {
  const client = getSupabaseClient();
  const { error } = await client.auth.signOut();

  if (error) {
    throw new Error(error.message);
  }
}
