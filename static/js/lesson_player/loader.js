export async function loadLesson(slug) {
  const params = new URLSearchParams(location.search);
  const isEdit = params.get('edit') === '1';
  const adminId = params.get('id');
  if (isEdit && adminId) {
    // Admin preview: fetch draft JSON directly from admin API
    const res = await fetch(`/admin/api/lessons/${encodeURIComponent(adminId)}`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.json || {};
  }
  const res = await fetch(`/api/lessons/${encodeURIComponent(slug)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.json();
}
