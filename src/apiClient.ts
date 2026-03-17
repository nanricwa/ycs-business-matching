/**
 * API クライアント
 * - Xserver 上（/match 配下）: 同一オリジンの /match/api を利用
 * - Vercel (match.ycscampaign.com 等): Xserver API に直接 CORS リクエスト
 * - ローカル開発: Vite proxy 経由の /api
 */
function resolveApiBase(): string {
  if (typeof window === 'undefined') return '/api';
  // Xserver 上で /match 配下に配置されている場合
  if (window.location.pathname.startsWith('/match')) return '/match/api';
  // Vercel デプロイ（match.ycscampaign.com など）→ Xserver に直接 CORS
  if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    return 'https://ycscampaign.com/match/api';
  }
  // ローカル開発 → Vite proxy
  return '/api';
}
const API_BASE = resolveApiBase();

const TOKEN_KEY = 'ycs_match_token';

export function getStoredToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setStoredToken(token: string | null): void {
  try {
    if (token == null) localStorage.removeItem(TOKEN_KEY);
    else localStorage.setItem(TOKEN_KEY, token);
  } catch {}
}

export interface UserProfile {
  id: number;
  name: string;
  email: string;
  phone: string;
  chatworkId: string;
  sns1Type: string;
  sns1Account: string;
  sns2Type: string;
  sns2Account: string;
  sns3Type: string;
  sns3Account: string;
  business?: string;
  businessName: string;
  industry: string;
  location?: string;
  country: string;
  region: string;
  city: string;
  skills: string[];
  interests: string[];
  message: string;
  mission: string;
  profileImage?: string | null;
  profileImageUrl?: string | null;
  role?: string;
  registeredAt: string;
  [key: string]: unknown;
}

export interface RegisterBody {
  name: string;
  email: string;
  password: string;
  phone?: string;
  chatworkId?: string;
  sns1Type?: string;
  sns1Account?: string;
  sns2Type?: string;
  sns2Account?: string;
  sns3Type?: string;
  sns3Account?: string;
  businessName?: string;
  industry?: string;
  businessDescription?: string;
  country?: string;
  region?: string;
  city?: string;
  skills?: string[];
  interests?: string[];
  message?: string;
  mission?: string;
  profileImageUrl?: string | null;
}

export interface LoginResponse {
  success?: boolean;
  token?: string;
  user?: UserProfile;
  error?: string;
}

export interface MeResponse {
  user?: UserProfile;
  error?: string;
}

export interface UsersResponse {
  users?: UserProfile[];
  error?: string;
}

async function request<T>(
  path: string,
  options: { method: 'GET' | 'POST'; body?: unknown; token?: string | null } = {}
): Promise<{ data: T; ok: boolean; status: number }> {
  const url = `${API_BASE}/${path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  const token = options.token ?? getStoredToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(url, {
    method: options.method,
    headers,
    body: options.body != null ? JSON.stringify(options.body) : undefined,
  });
  let data: T;
  const text = await res.text();
  try {
    data = (text ? JSON.parse(text) : {}) as T;
  } catch {
    const preview = text.trim().slice(0, 150);
    const message = preview ? `Invalid response (${res.status}): ${preview}${text.length > 150 ? '…' : ''}` : `Invalid response (status ${res.status})`;
    data = { error: message } as T;
  }
  return { data, ok: res.ok, status: res.status };
}

/** プロフィール画像をアップロードし、保存先URLを返す */
export async function apiUploadImage(file: File): Promise<{ url?: string; error?: string } & { ok: boolean }> {
  const formData = new FormData();
  formData.append('image', file);
  try {
    const res = await fetch(`${API_BASE}/upload-image.php`, {
      method: 'POST',
      body: formData,
    });
    const data = await res.json();
    return { ...data, ok: res.ok };
  } catch {
    return { error: 'Upload failed', ok: false };
  }
}

export async function apiRegister(body: RegisterBody): Promise<LoginResponse & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<LoginResponse>('register.php', { method: 'POST', body });
  return { ...data, ok, status };
}

/** プロフィール更新（ログインユーザー自身） */
export async function apiUpdateProfile(body: Partial<RegisterBody> & { profileImageUrl?: string | null }): Promise<{ success?: boolean; user?: UserProfile; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ success?: boolean; user?: UserProfile; error?: string }>('update-profile.php', {
    method: 'POST',
    body,
  });
  return { ...data, ok, status };
}

export async function apiLogin(email: string, password: string): Promise<LoginResponse & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<LoginResponse>('login.php', {
    method: 'POST',
    body: { email, password },
  });
  return { ...data, ok, status };
}

export async function apiMe(): Promise<MeResponse & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<MeResponse>('me.php', { method: 'GET' });
  return { ...data, ok, status };
}

export async function apiUsers(params?: {
  industry?: string;
  region?: string;
  skill?: string;
  interest?: string;
}): Promise<UsersResponse & { ok: boolean; status: number }> {
  const q = new URLSearchParams();
  if (params?.industry) q.set('industry', params.industry);
  if (params?.region) q.set('region', params.region);
  if (params?.skill) q.set('skill', params.skill);
  if (params?.interest) q.set('interest', params.interest);
  const path = q.toString() ? `users.php?${q.toString()}` : 'users.php';
  const { data, ok, status } = await request<UsersResponse>(path, { method: 'GET' });
  return { ...data, ok, status };
}

/** ユーザーの role を変更する（管理者のみ） */
export async function apiUpdateRole(userId: number, role: 'admin' | 'user'): Promise<{ success?: boolean; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ success?: boolean; error?: string }>('update-role.php', {
    method: 'POST',
    body: { userId, role },
  });
  return { ...data, ok, status };
}

/** 退会者削除（管理者のみ）。自分自身・最後の管理者は削除不可。 */
export async function apiDeleteUser(userId: number): Promise<{ success?: boolean; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ success?: boolean; error?: string }>('delete-user.php', {
    method: 'POST',
    body: { userId: userId },
  });
  return { ...data, ok, status };
}

/** ログイン済みなら誰でも取得できるメンバー一覧（マッチング・検索用） */
export async function apiMembers(params?: {
  industry?: string;
  region?: string;
  skill?: string;
  interest?: string;
}): Promise<UsersResponse & { ok: boolean; status: number }> {
  const q = new URLSearchParams();
  if (params?.industry) q.set('industry', params.industry);
  if (params?.region) q.set('region', params.region);
  if (params?.skill) q.set('skill', params.skill);
  if (params?.interest) q.set('interest', params.interest);
  const path = q.toString() ? `members.php?${q.toString()}` : 'members.php';
  const { data, ok, status } = await request<UsersResponse>(path, { method: 'GET' });
  return { ...data, ok, status };
}

/** パスワード再設定リンク送信（登録済みメールに送信） */
export async function apiForgotPassword(email: string): Promise<{ success?: boolean; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ success?: boolean; error?: string }>('forgot-password.php', {
    method: 'POST',
    body: { email },
  });
  return { ...data, ok, status };
}

/** パスワード再設定実行（トークン + 新しいパスワード） */
export async function apiResetPassword(token: string, newPassword: string): Promise<{ success?: boolean; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ success?: boolean; error?: string }>('reset-password.php', {
    method: 'POST',
    body: { token, newPassword },
  });
  return { ...data, ok, status };
}

/** メール通知設定 */
export interface NotificationSettings {
  admin_notify_enabled: string;
  admin_notify_subject: string;
  admin_notify_body: string;
  user_welcome_enabled: string;
  user_welcome_subject: string;
  user_welcome_body: string;
  password_reset_subject: string;
  password_reset_body: string;
  [key: string]: string;
}

/** メール通知設定を取得（管理者のみ） */
export async function apiGetNotificationSettings(): Promise<{ settings?: NotificationSettings; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ settings?: NotificationSettings; error?: string }>('notification-settings.php', {
    method: 'GET',
  });
  return { ...data, ok, status };
}

/** メール通知設定を保存（管理者のみ） */
export async function apiSaveNotificationSettings(settings: Partial<NotificationSettings>): Promise<{ success?: boolean; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ success?: boolean; error?: string }>('notification-settings.php', {
    method: 'POST',
    body: { settings },
  });
  return { ...data, ok, status };
}

/** お気に入り一覧を取得 */
export async function apiFavorites(): Promise<{ favoriteIds?: number[]; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ favoriteIds?: number[]; error?: string }>('favorites.php', { method: 'GET' });
  return { ...data, ok, status };
}

/** お気に入りをトグル（追加/削除） */
export async function apiToggleFavorite(targetUserId: number): Promise<{ success?: boolean; action?: string; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ success?: boolean; action?: string; error?: string }>('favorites.php', {
    method: 'POST',
    body: { targetUserId },
  });
  return { ...data, ok, status };
}

/** レビュー */
export interface Review {
  id: number;
  reviewerId: number;
  reviewerName: string;
  reviewerImage: string;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

/** 指定ユーザーのレビュー一覧を取得 */
export async function apiGetReviews(userId: number): Promise<{ reviews?: Review[]; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ reviews?: Review[]; error?: string }>(`reviews.php?userId=${userId}`, { method: 'GET' });
  return { ...data, ok, status };
}

/** レビューを投稿/更新 */
export async function apiPostReview(targetUserId: number, comment: string): Promise<{ success?: boolean; action?: string; error?: string } & { ok: boolean; status: number }> {
  const { data, ok, status } = await request<{ success?: boolean; action?: string; error?: string }>('reviews.php', {
    method: 'POST',
    body: { targetUserId, comment },
  });
  return { ...data, ok, status };
}
