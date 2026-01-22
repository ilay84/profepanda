export async function me() {
  const res = await fetch("/api/me", { credentials: "same-origin" });
  if (!res.ok) {
    return null;
  }
  const data = await res.json();
  if (!data || !data.is_authenticated) {
    return null;
  }
  return data;
}

export async function logout() {
  try {
    await fetch("/auth/logout", { method: "POST", credentials: "same-origin" });
  } finally {
    window.location.href = "/courses";
  }
}
