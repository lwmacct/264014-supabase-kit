import { createClient } from "@supabase/supabase-js";

const missingConfigurationError =
  "认证服务尚未配置，请设置 VITE_SUPABASE_ANON_KEY。";
const invalidUrlConfigurationError =
  "VITE_SUPABASE_URL 必须是相对路径，或浏览器可访问的绝对 http(s) URL。";

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

function getBrowserBaseUrl() {
  if (typeof window === "undefined") {
    return "http://127.0.0.1/";
  }

  return new URL(".", window.location.href).toString();
}

function getRuntimeConfiguration() {
  if (typeof window === "undefined") {
    return {};
  }

  return window.__APP_ENV__ ?? {};
}

function getConfiguredSupabaseUrl() {
  const runtimeUrl = getRuntimeConfiguration().VITE_SUPABASE_URL?.trim() ?? "";
  const buildTimeUrl = import.meta.env.VITE_SUPABASE_URL?.trim() ?? "";
  return runtimeUrl || buildTimeUrl || "./supabase";
}

function getConfiguredSupabaseAnonKey() {
  const runtimeAnonKey =
    getRuntimeConfiguration().VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  const buildTimeAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? "";
  return runtimeAnonKey || buildTimeAnonKey;
}

function resolveSupabaseUrl() {
  const configuredUrl = getConfiguredSupabaseUrl();

  if (!configuredUrl) {
    return "";
  }

  try {
    const parsedUrl = new URL(configuredUrl, getBrowserBaseUrl());

    if (parsedUrl.protocol !== "http:" && parsedUrl.protocol !== "https:") {
      return "";
    }

    return trimTrailingSlash(parsedUrl.toString());
  } catch {
    return "";
  }
}

const supabaseUrl = resolveSupabaseUrl();
const supabaseAnonKey = getConfiguredSupabaseAnonKey();
const configuredSupabaseUrl = getConfiguredSupabaseUrl();

export function getSupabaseConfigurationError() {
  if (!supabaseAnonKey) {
    return missingConfigurationError;
  }

  if (!configuredSupabaseUrl || !supabaseUrl) {
    return invalidUrlConfigurationError;
  }

  return "";
}

export const isSupabaseConfigured = !getSupabaseConfigurationError();

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

export function getSupabaseClient() {
  if (!supabase) {
    throw new Error(getSupabaseConfigurationError());
  }

  return supabase;
}

export function getAuthRedirectUrl() {
  if (typeof window === "undefined") {
    return undefined;
  }

  const redirectUrl = new URL(getBrowserBaseUrl());
  redirectUrl.hash = "/auth";
  return redirectUrl.toString();
}
