import React, { useState, ChangeEvent, useEffect } from 'react';
import { Users, Briefcase, MapPin, Heart, Search, MessageCircle, TrendingUp, Plus, X, Shield, Download, User, Edit2, Save, RefreshCw, Trash2, LayoutGrid, LogOut, Menu, SlidersHorizontal } from 'lucide-react';
import { Footer } from './src/Footer';
import {
  getStoredToken,
  setStoredToken,
  apiRegister,
  apiLogin,
  apiMe,
  apiMembers,
  apiUsers,
  apiDeleteUser,
  apiUpdateRole,
  apiForgotPassword,
  apiResetPassword,
  type UserProfile as ApiUserProfile,
  type RegisterBody,
} from './src/apiClient';

interface UserProfile {
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
  business: string;
  businessName: string;
  industry: string;
  location: string;
  country: string;
  region: string;
  city: string;
  distance?: string;
  skills: string[];
  interests: string[];
  message: string;
  mission: string;
  matchScore?: number;
  businessScore?: number;
  locationScore?: number;
  interestScore?: number;
  image?: string;
  profileImage?: string | null;
  role?: string;
  registeredAt: string;
}

interface FormDataState {
  name: string;
  email: string;
  password: string;
  passwordConfirm: string;
  phone: string;
  chatworkId: string;
  sns1Type: string;
  sns1Account: string;
  sns2Type: string;
  sns2Account: string;
  sns3Type: string;
  sns3Account: string;
  businessName: string;
  industry: string;
  businessDescription: string;
  country: string;
  region: string;
  city: string;
  skills: string[];
  interests: string[];
  message: string;
  mission: string;
  agreedToTerms: boolean;
  agreedToPrivacy: boolean;
  profileImage: File | null;
  profileImagePreview: string | null;
  [key: string]: any;
}

interface SearchFilters {
  industry: string;
  region: string;
  skill: string;
  interest: string;
}

const BusinessMatchingApp: React.FC = () => {
  const [currentView, setCurrentView] = useState<string>('welcome');
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isAdmin, setIsAdmin] = useState<boolean>(false);
  const [registrationStep, setRegistrationStep] = useState<number>(1);
  const [isEditMode, setIsEditMode] = useState<boolean>(false);
  const [currentUserProfile, setCurrentUserProfile] = useState<UserProfile | null>(null);
  const [resetEmail, setResetEmail] = useState<string>('');
  const [newPassword, setNewPassword] = useState<string>('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState<string>('');
  const [tempSkill, setTempSkill] = useState<string>('');
  const [tempInterest, setTempInterest] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [membersList, setMembersList] = useState<UserProfile[]>([]);
  const [membersLoading, setMembersLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<string>('');
  const [adminUsersList, setAdminUsersList] = useState<UserProfile[]>([]);
  const [adminRefreshKey, setAdminRefreshKey] = useState<number>(0);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [keywordSearch, setKeywordSearch] = useState<string>('');
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState<boolean>(false);
  const [resetToken, setResetToken] = useState<string>('');
  const [forgotPasswordLoading, setForgotPasswordLoading] = useState<boolean>(false);
  const [resetPasswordLoading, setResetPasswordLoading] = useState<boolean>(false);

  const [searchFilters, setSearchFilters] = useState<SearchFilters>({
    industry: '',
    region: '',
    skill: '',
    interest: ''
  });
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [logoImage, setLogoImage] = useState<string | null | ArrayBuffer>(null);

  const [formData, setFormData] = useState<FormDataState>({
    name: '',
    email: '',
    password: '',
    passwordConfirm: '',
    phone: '',
    chatworkId: '',
    sns1Type: '',
    sns1Account: '',
    sns2Type: '',
    sns2Account: '',
    sns3Type: '',
    sns3Account: '',
    businessName: '',
    industry: '',
    businessDescription: '',
    country: '',
    region: '',
    city: '',
    skills: [],
    interests: [],
    message: '',
    mission: '',
    agreedToTerms: false,
    agreedToPrivacy: false,
    profileImage: null,
    profileImagePreview: null
  });

  useEffect(() => {
    const token = getStoredToken();
    const publicViews = ['welcome', 'register', 'forgot-password', 'reset-link-sent', 'reset-password', 'password-reset-complete', 'login'];
    if (!token) {
      if (!publicViews.includes(currentView)) setCurrentView('welcome');
      return;
    }
    apiMe().then((res) => {
      if (res.ok && res.user) {
        setIsLoggedIn(true);
        setCurrentUserProfile(res.user as UserProfile);
        setIsAdmin((res.user as ApiUserProfile).role === 'admin');
      } else {
        setStoredToken(null);
        if (!publicViews.includes(currentView)) setCurrentView('welcome');
      }
    });
  }, []);

  useEffect(() => {
    if (!isLoggedIn || !getStoredToken()) return;
    setMembersLoading(true);
    apiMembers()
      .then((res) => {
        if (res.ok && res.users) setMembersList(res.users as UserProfile[]);
      })
      .finally(() => setMembersLoading(false));
  }, [isLoggedIn]);

  useEffect(() => {
    if (currentView === 'admin' && isAdmin && getStoredToken()) {
      setApiError('');
      apiUsers().then((r) => {
        if (r.ok && r.users) {
          setAdminUsersList(r.users as UserProfile[]);
        } else {
          setApiError(`ユーザー一覧の取得に失敗: ${r.error || `status=${r.status}`}`);
        }
      }).catch((e) => {
        setApiError(`ユーザー一覧の取得エラー: ${e instanceof Error ? e.message : String(e)}`);
      });
    }
  }, [currentView, isAdmin, adminRefreshKey]);

  // パスワード再設定リンクから遷移した場合（#reset-password?token=xxx）
  useEffect(() => {
    const hash = window.location.hash || '';
    const match = hash.match(/#reset-password\?token=([^&]+)/);
    if (match && match[1]) {
      setResetToken(match[1]);
      setCurrentView('reset-password');
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({
          ...prev,
          profileImage: file,
          profileImagePreview: reader.result as string
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const addSkill = (skill: string) => {
    if (skill && !formData.skills.includes(skill)) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, skill] }));
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const addInterest = (interest: string) => {
    if (interest && !formData.interests.includes(interest)) {
      setFormData(prev => ({ ...prev, interests: [...prev.interests, interest] }));
    }
  };

  const removeInterest = (interest: string) => {
    setFormData(prev => ({ ...prev, interests: prev.interests.filter(i => i !== interest) }));
  };

  const handleSearchFilterChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchFilters(prev => ({ ...prev, [name]: value }));
  };

  const performSearch = () => {
    let results = [...membersList];

    if (searchFilters.industry) {
      results = results.filter(user => 
        user.industry.toLowerCase().includes(searchFilters.industry.toLowerCase())
      );
    }

    if (searchFilters.region) {
      results = results.filter(user => 
        user.region.toLowerCase().includes(searchFilters.region.toLowerCase()) ||
        user.city.toLowerCase().includes(searchFilters.region.toLowerCase())
      );
    }

    if (searchFilters.skill) {
      results = results.filter(user => 
        user.skills.some(skill => 
          skill.toLowerCase().includes(searchFilters.skill.toLowerCase())
        )
      );
    }

    if (searchFilters.interest) {
      results = results.filter(user => 
        user.interests.some(interest => 
          interest.toLowerCase().includes(searchFilters.interest.toLowerCase())
        )
      );
    }

    setSearchResults(results);
  };

  /** スペース区切りのAND検索で部分一致フィルタ */
  const filterByKeyword = (users: UserProfile[], query: string): UserProfile[] => {
    const trimmed = query.trim();
    if (!trimmed) return users;
    const tokens = trimmed.toLowerCase().split(/\s+/);
    return users.filter(user => {
      const haystack = [
        user.name,
        user.businessName,
        user.business,
        user.industry,
        user.region,
        user.city,
        ...(user.skills || []),
        ...(user.interests || []),
        user.message,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return tokens.every(t => haystack.includes(t));
    });
  };

  const downloadCSV = () => {
    const headers = [
      'ID',
      '名前',
      'メールアドレス',
      '電話番号',
      'Chatwork ID',
      'SNS1種類',
      'SNS1アカウント',
      'SNS2種類',
      'SNS2アカウント',
      'SNS3種類',
      'SNS3アカウント',
      'ビジネス名',
      '業種',
      'ビジネス内容',
      '国',
      '都道府県',
      '市区町村',
      '提供できる価値',
      '興味・関心',
      'メッセージ',
      '価値観・ミッション',
      '登録日'
    ];

    const rows = adminUsersList.map(user => [
      user.id,
      user.name,
      user.email,
      user.phone,
      user.chatworkId || '',
      user.sns1Type || '',
      user.sns1Account || '',
      user.sns2Type || '',
      user.sns2Account || '',
      user.sns3Type || '',
      user.sns3Account || '',
      user.businessName,
      user.industry,
      (user as UserProfile & { business?: string }).business ?? user.businessName ?? '',
      user.country,
      user.region,
      user.city,
      user.skills.join('、'),
      user.interests.join('、'),
      user.message || '',
      user.mission || '',
      user.registeredAt
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const bom = '\uFEFF';
    const blob = new Blob([bom + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    link.setAttribute('href', url);
    link.setAttribute('download', `users_data_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBulkDelete = async () => {
    const ids = Array.from(selectedUserIds).filter((id) => id !== currentUserProfile?.id);
    if (ids.length === 0) {
      alert('削除対象のユーザーを選択してください（自分自身は除外されます）');
      return;
    }
    const names = adminUsersList
      .filter((u) => ids.includes(u.id))
      .map((u) => `${u.name}（${u.email}）`)
      .join('\n');
    if (!confirm(`以下の ${ids.length} 名を削除しますか？\nこの操作は取り消せません。\n\n${names}`)) return;
    setBulkDeleting(true);
    const errors: string[] = [];
    const deleted: number[] = [];
    for (const id of ids) {
      try {
        const res = await apiDeleteUser(id);
        if (res.ok && res.success) {
          deleted.push(id);
        } else {
          const user = adminUsersList.find((u) => u.id === id);
          errors.push(`${user?.name || `ID:${id}`}: ${res.error || '削除失敗'}`);
        }
      } catch {
        errors.push(`ID:${id}: 通信エラー`);
      }
    }
    if (deleted.length > 0) {
      setAdminUsersList((prev) => prev.filter((u) => !deleted.includes(u.id)));
    }
    setSelectedUserIds(new Set());
    setBulkDeleting(false);
    if (errors.length > 0) {
      alert(`${deleted.length} 件削除しました。\n以下は失敗しました:\n${errors.join('\n')}`);
    } else {
      alert(`${deleted.length} 件を削除しました。`);
    }
  };

  const renderStars = (score?: number) => {
    const s = score || 0;
    return '★'.repeat(s) + '☆'.repeat(5 - s);
  };

  const renderAuthLeftPanel = () => (
    <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white flex-col justify-center px-12">
      <div className="flex items-center gap-3 mb-12">
        <div className="w-12 h-12 bg-yellow-400 rounded-lg flex items-center justify-center">
          <span className="text-slate-900 font-black text-2xl">Y</span>
        </div>
        <span className="text-2xl font-bold tracking-tight">YCS Business Network</span>
      </div>
      <h1 className="text-5xl font-extrabold leading-tight mb-6">
        Connect.<br />Collaborate.<br />Grow.
      </h1>
      <p className="text-slate-400 text-lg max-w-md">
        プロフェッショナルのための最高峰ビジネスマッチングプラットフォーム。業界、所在地、そして共有するビジョンに基づいて、最適なパートナーを見つけましょう。
      </p>
    </div>
  );

  const renderWelcomeView = () => (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      {renderAuthLeftPanel()}
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-black text-xl">Y</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">YCS Business Network</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2 text-center">Welcome</h2>
          <p className="text-sm text-gray-500 mb-8 text-center">ビジネスネットワークに参加しましょう</p>
          <div className="space-y-4">
            <button
              onClick={() => { setPasswordError(''); setApiError(''); setCurrentView('login'); }}
              className="w-full bg-slate-800 text-white py-3.5 rounded-lg font-semibold hover:bg-slate-700 transition-colors"
            >
              Sign In
            </button>
            <button
              onClick={() => { setPasswordError(''); setShowPassword(false); setCurrentView('register'); }}
              className="w-full bg-white border border-gray-300 text-gray-700 py-3.5 rounded-lg font-semibold hover:bg-gray-50 transition-colors"
            >
              新規登録（無料）
            </button>
            <div className="text-center pt-2">
              <button onClick={() => setCurrentView('forgot-password')} className="text-indigo-600 text-sm hover:text-indigo-500 font-medium">
                パスワードを忘れた方はこちら
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderLoginView = () => (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      {renderAuthLeftPanel()}
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-md">
          <div className="lg:hidden flex items-center gap-3 mb-8 justify-center">
            <div className="w-10 h-10 bg-yellow-400 rounded-lg flex items-center justify-center">
              <span className="text-slate-900 font-black text-xl">Y</span>
            </div>
            <span className="text-xl font-bold tracking-tight text-gray-900">YCS Business Network</span>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-8">Enter your credentials to access the network.</p>
          {apiError && <p className="text-red-600 text-sm mb-4">{apiError}</p>}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const email = (e.currentTarget.elements.namedItem('email') as HTMLInputElement).value.trim();
              const password = (e.currentTarget.elements.namedItem('password') as HTMLInputElement).value;
              if (!email || !password) {
                setApiError('メールアドレスとパスワードを入力してください');
                return;
              }
              setApiError('');
              apiLogin(email, password).then((res) => {
                if (res.ok && res.token && res.user) {
                  setStoredToken(res.token);
                  setIsLoggedIn(true);
                  setCurrentUserProfile(res.user as UserProfile);
                  setIsAdmin((res.user as ApiUserProfile).role === 'admin');
                  setCurrentView('home');
                } else {
                  setApiError(res.error || 'ログインに失敗しました');
                }
              });
            }}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Email address</label>
              <input name="email" type="email" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="demo@example.com" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
              <input name="password" type="password" required className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none" placeholder="••••••••" />
            </div>
            <button type="submit" className="w-full bg-slate-800 text-white py-3.5 rounded-lg font-semibold hover:bg-slate-700 transition-colors">
              Sign In
            </button>
          </form>
          <p className="text-center text-sm text-gray-500 mt-6">
            Don't have an account?{' '}
            <button onClick={() => { setApiError(''); setCurrentView('register'); }} className="text-indigo-600 hover:text-indigo-500 font-medium">
              Request access
            </button>
          </p>
        </div>
      </div>
    </div>
  );

  const renderRegistrationView = () => {
    const validatePassword = () => {
      if (formData.password.length < 8) {
        setPasswordError('パスワードは8文字以上で設定してください');
        return false;
      }
      if (formData.password !== formData.passwordConfirm) {
        setPasswordError('パスワードが一致しません');
        return false;
      }
      setPasswordError('');
      return true;
    };

    const handleNextStep = () => {
      if (registrationStep === 1) {
        if (!formData.name || !formData.email || !formData.password || !formData.passwordConfirm || !formData.phone) {
          alert('必須項目（お名前、メールアドレス、パスワード、電話番号）をすべて入力してください');
          return;
        }
        if (!validatePassword()) {
          return;
        }
        if (!formData.agreedToTerms) {
          alert('利用規約に同意してください');
          return;
        }
        if (!formData.agreedToPrivacy) {
          alert('プライバシーポリシーに同意してください');
          return;
        }
      }
      if (registrationStep === 2) {
        if (!formData.businessName || !formData.industry) {
          alert('必須項目（ビジネス名、業種）をすべて入力してください');
          return;
        }
      }
      setRegistrationStep(registrationStep + 1);
    };

    return (
      <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
        {renderAuthLeftPanel()}
        <div className="flex-1 flex items-start justify-center bg-white p-6 overflow-y-auto">
        <div className="w-full max-w-lg py-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900">新規登録</h2>
            <button
              onClick={() => setCurrentView('welcome')}
              className="text-gray-400 hover:text-gray-600"
            >
              <X size={24} />
            </button>
          </div>

          <div className="mb-6">
            <div className="flex justify-between items-center">
              {[1, 2, 3].map(step => (
                <div key={step} className="flex items-center">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${
                    registrationStep >= step ? 'bg-slate-800 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {step}
                  </div>
                  {step < 3 && (
                    <div className={`w-20 h-1 ${registrationStep > step ? 'bg-indigo-500' : 'bg-gray-200'}`} />
                  )}
                </div>
              ))}
            </div>
            <div className="flex justify-between mt-2 text-sm">
              <span>基本情報</span>
              <span>ビジネス</span>
              <span>プロフィール</span>
            </div>
          </div>

          {apiError && (
            <div className="mb-4 p-4 bg-red-50 border-2 border-red-200 rounded-lg">
              <p className="text-sm font-semibold text-red-800 mb-2">エラー（下の文を選択してコピーできます）</p>
              <pre className="text-sm text-red-700 whitespace-pre-wrap break-all overflow-auto min-h-[120px] p-3 bg-white rounded border border-red-100" style={{ userSelect: 'text' }}>{apiError}</pre>
              <button type="button" onClick={() => setApiError('')} className="mt-2 text-sm text-red-600 hover:underline font-semibold">閉じる</button>
            </div>
          )}

          {registrationStep === 1 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">基本情報を入力</h3>
              
              <div className="flex flex-col items-center mb-6">
                <label className="block text-sm font-semibold mb-2">プロフィール画像</label>
                <div className="relative">
                  <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden border-4 border-purple-500">
                    {formData.profileImagePreview ? (
                      <img src={formData.profileImagePreview} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <User size={48} className="text-gray-300" />
                    )}
                  </div>
                  <label className="absolute bottom-0 right-0 bg-slate-800 text-white rounded-full p-2 cursor-pointer hover:bg-slate-700 transition-colors">
                    <Plus size={20} />
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleImageUpload}
                      className="hidden"
                    />
                  </label>
                </div>
                <p className="text-xs text-gray-500 mt-2">クリックして画像を選択</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">お名前 *</label>
                <input 
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="山田 太郎"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">メールアドレス *</label>
                <input 
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="example@email.com"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">パスワード *</label>
                <input 
                  type={showPassword ? "text" : "password"}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="8文字以上"
                />
                <p className="text-xs text-gray-500 mt-1">8文字以上で設定してください</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">パスワード（確認） *</label>
                <input 
                  type={showPassword ? "text" : "password"}
                  name="passwordConfirm"
                  value={formData.passwordConfirm}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="もう一度入力してください"
                />
                {passwordError && (
                  <p className="text-xs text-red-600 mt-1">{passwordError}</p>
                )}
              </div>

              <div className="flex items-center">
                <input 
                  type="checkbox"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="mr-2"
                />
                <label className="text-sm">パスワードを表示する</label>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">電話番号 *</label>
                <input 
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="090-1234-5678"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Chatwork ID</label>
                <input 
                  type="text"
                  name="chatworkId"
                  value={formData.chatworkId}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="your_chatwork_id"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">価値観・ミッション</label>
                <textarea 
                  name="mission"
                  value={formData.mission}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none h-24"
                  placeholder="あなたのビジネスの価値観やミッション、大切にしていることを入力してください..."
                />
                <p className="text-xs text-gray-500 mt-1">ビジネスで大切にしている価値観や目指していることを教えてください</p>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">SNSアカウント（最大3つ）</label>
                <div className="space-y-3">
                  {[1, 2, 3].map(num => (
                    <div key={num} className="grid grid-cols-3 gap-2">
                      <select
                        name={`sns${num}Type`}
                        value={formData[`sns${num}Type`]}
                        onChange={handleInputChange}
                        className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                      >
                        <option value="">SNS選択</option>
                        <option value="𝕏 (Twitter)">𝕏 (Twitter)</option>
                        <option value="Facebook">Facebook</option>
                        <option value="Instagram">Instagram</option>
                        <option value="YouTube">YouTube</option>
                        <option value="TikTok">TikTok</option>
                        <option value="LINE">LINE</option>
                        <option value="LinkedIn">LinkedIn</option>
                        <option value="Note">Note</option>
                        <option value="その他">その他</option>
                      </select>
                      <input 
                        type="text"
                        name={`sns${num}Account`}
                        value={formData[`sns${num}Account`]}
                        onChange={handleInputChange}
                        className="col-span-2 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                        placeholder="アカウント名またはURL"
                        disabled={!formData[`sns${num}Type`]}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="border-t pt-4 space-y-3">
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.agreedToTerms}
                    onChange={(e) => setFormData(prev => ({ ...prev, agreedToTerms: e.target.checked }))}
                    className="mr-3 mt-1"
                  />
                  <label className="text-sm">
                    <a href="/match/terms.html" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">利用規約</a>に同意します <span className="text-red-500">*</span>
                  </label>
                </div>
                <div className="flex items-start">
                  <input
                    type="checkbox"
                    checked={formData.agreedToPrivacy}
                    onChange={(e) => setFormData(prev => ({ ...prev, agreedToPrivacy: e.target.checked }))}
                    className="mr-3 mt-1"
                  />
                  <label className="text-sm">
                    <a href="/match/privacy.html" target="_blank" rel="noopener noreferrer" className="text-purple-600 hover:underline">プライバシーポリシー</a>に同意します <span className="text-red-500">*</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {registrationStep === 2 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">ビジネス情報を入力</h3>
              <div>
                <label className="block text-sm font-semibold mb-2">ビジネス名 *</label>
                <input 
                  type="text"
                  name="businessName"
                  value={formData.businessName}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                  placeholder="株式会社〇〇"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">業種 *</label>
                <select 
                  name="industry"
                  value={formData.industry}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">選択してください</option>
                  <option value="it">IT・テクノロジー</option>
                  <option value="manufacturing">製造業</option>
                  <option value="retail">小売・EC</option>
                  <option value="food">飲食業</option>
                  <option value="consulting">コンサルティング</option>
                  <option value="other">その他</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">ビジネス内容</label>
                <textarea 
                  name="businessDescription"
                  value={formData.businessDescription}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none h-24"
                  placeholder="どんなビジネスをされていますか？"
                />
              </div>
            </div>
          )}

          {registrationStep === 3 && (
            <div className="space-y-4">
              <h3 className="text-xl font-bold mb-4">プロフィール詳細</h3>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-semibold mb-2">国</label>
                  <input 
                    type="text"
                    name="country"
                    value={formData.country}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="日本"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">都道府県</label>
                  <input 
                    type="text"
                    name="region"
                    value={formData.region}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="東京都"
                  />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-2">市区町村</label>
                  <input 
                    type="text"
                    name="city"
                    value={formData.city}
                    onChange={handleInputChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="港区"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">提供できる価値・スキル <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text"
                    value={tempSkill}
                    onChange={(e) => setTempSkill(e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="例：Webマーケティング"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addSkill(tempSkill);
                        setTempSkill('');
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      addSkill(tempSkill);
                      setTempSkill('');
                    }}
                    className="bg-slate-800 text-white px-4 rounded-lg hover:bg-slate-700"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.skills.map((skill, idx) => (
                    <span key={idx} className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {skill}
                      <button onClick={() => removeSkill(skill)} className="hover:text-purple-900">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">興味・関心 <span className="text-red-500">*</span></label>
                <div className="flex gap-2 mb-2">
                  <input 
                    type="text"
                    value={tempInterest}
                    onChange={(e) => setTempInterest(e.target.value)}
                    className="flex-1 p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="例：DX推進"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addInterest(tempInterest);
                        setTempInterest('');
                      }
                    }}
                  />
                  <button 
                    onClick={() => {
                      addInterest(tempInterest);
                      setTempInterest('');
                    }}
                    className="bg-slate-800 text-white px-4 rounded-lg hover:bg-slate-700"
                  >
                    <Plus size={20} />
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.interests.map((interest, idx) => (
                    <span key={idx} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm flex items-center gap-2">
                      {interest}
                      <button onClick={() => removeInterest(interest)} className="hover:text-blue-900">
                        <X size={14} />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold mb-2">メンバーへのメッセージ <span className="text-red-500">*</span></label>
                <textarea 
                  name="message"
                  value={formData.message}
                  onChange={handleInputChange}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none h-32"
                  placeholder="他のメンバーに向けて、自己紹介やつながりたい内容などを自由に入力してください..."
                />
                <p className="text-xs text-gray-500 mt-1">このメッセージは他のメンバーがあなたのプロフィールを見た際に表示されます</p>
              </div>
            </div>
          )}

          <div className="flex gap-4 mt-6">
            {registrationStep > 1 && (
              <button 
                onClick={() => setRegistrationStep(registrationStep - 1)}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
              >
                戻る
              </button>
            )}
            {registrationStep < 3 ? (
              <button 
                onClick={handleNextStep}
                className="flex-1 bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700 transition-colors"
              >
                次へ
              </button>
            ) : (
              <button
                onClick={async () => {
                  const finalSkills = [...formData.skills];
                  if (tempSkill.trim() && !finalSkills.includes(tempSkill.trim())) {
                    finalSkills.push(tempSkill.trim());
                  }
                  const finalInterests = [...formData.interests];
                  if (tempInterest.trim() && !finalInterests.includes(tempInterest.trim())) {
                    finalInterests.push(tempInterest.trim());
                  }

                  // ステップ3 必須項目チェック
                  if (finalSkills.length === 0) {
                    alert('「提供できる価値・スキル」を1つ以上入力してください');
                    return;
                  }
                  if (finalInterests.length === 0) {
                    alert('「興味・関心」を1つ以上入力してください');
                    return;
                  }
                  if (!formData.message.trim()) {
                    alert('「メンバーへのメッセージ」を入力してください');
                    return;
                  }

                  setTempSkill('');
                  setTempInterest('');

                  const body: RegisterBody = {
                    name: formData.name,
                    email: formData.email,
                    password: formData.password,
                    phone: formData.phone,
                    chatworkId: formData.chatworkId,
                    sns1Type: formData.sns1Type,
                    sns1Account: formData.sns1Account,
                    sns2Type: formData.sns2Type,
                    sns2Account: formData.sns2Account,
                    sns3Type: formData.sns3Type,
                    sns3Account: formData.sns3Account,
                    businessName: formData.businessName,
                    industry: formData.industry,
                    businessDescription: formData.businessDescription,
                    country: formData.country,
                    region: formData.region,
                    city: formData.city,
                    skills: finalSkills,
                    interests: finalInterests,
                    message: formData.message,
                    mission: formData.mission,
                    profileImageUrl: formData.profileImagePreview && typeof formData.profileImagePreview === 'string' && !formData.profileImagePreview.startsWith('data:') ? formData.profileImagePreview : undefined,
                  };

                  const regRes = await apiRegister(body);
                  if (!regRes.ok || regRes.error) {
                    setApiError(regRes.error || '登録に失敗しました');
                    return;
                  }
                  const loginRes = await apiLogin(formData.email, formData.password);
                  if (loginRes.ok && loginRes.token && loginRes.user) {
                    setStoredToken(loginRes.token);
                    setIsLoggedIn(true);
                    setCurrentUserProfile(loginRes.user as UserProfile);
                    setIsAdmin((loginRes.user as ApiUserProfile).role === 'admin');
                    setCurrentView('registration-complete');
                  } else {
                    setCurrentView('registration-complete');
                  }
                }}
                className="flex-1 bg-slate-800 text-white py-3 rounded-lg font-bold hover:bg-slate-700 transition-colors"
              >
                登録完了
              </button>
            )}
          </div>
        </div>
        </div>
      </div>
    );
  };

  const renderRegistrationCompleteView = () => (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      {renderAuthLeftPanel()}
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-3xl font-bold mb-4 text-gray-900">登録完了！</h2>
          <p className="text-gray-600 mb-6">
            YCSマッチングプラットフォームへようこそ！<br />
            登録が完了しました。
          </p>

          <div className="bg-gray-50 p-4 rounded-lg mb-6 text-left">
            <h3 className="font-bold mb-3 text-gray-800">ログイン情報</h3>
            <div className="space-y-2 text-sm">
              <div>
                <span className="text-gray-600">メールアドレス:</span>
                <p className="font-semibold text-gray-800">{formData.email}</p>
              </div>
              <div>
                <span className="text-gray-600">パスワード:</span>
                <p className="font-semibold text-gray-800">設定済み（●●●●●●●●）</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-3">
              ※ この情報は大切に保管してください
            </p>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700">
              確認メールを <strong>{formData.email}</strong> に送信しました。<br />
              登録内容とログイン方法を記載しています。このメールアドレスとパスワードで、トップの「ログイン」からログインできます。
            </p>
          </div>

          <button
            onClick={() => setCurrentView('home')}
            className="w-full bg-slate-800 text-white py-3.5 rounded-lg font-semibold hover:bg-slate-700 transition-colors"
          >
            マッチングを始める
          </button>
        </div>
      </div>
    </div>
  );

  const renderForgotPasswordView = () => (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      {renderAuthLeftPanel()}
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-md">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold mb-1 text-gray-900">パスワードを忘れた方</h2>
            <p className="text-gray-500 text-sm">
              登録されているメールアドレスを入力してください。<br />
              パスワード再設定用のリンクをお送りします。
            </p>
          </div>

          {apiError && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{apiError}</div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => { setResetEmail(e.target.value); setApiError(''); }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                placeholder="example@email.com"
              />
            </div>

            <button
              disabled={forgotPasswordLoading}
              onClick={async () => {
                if (!resetEmail) { setApiError('メールアドレスを入力してください'); return; }
                if (!resetEmail.includes('@')) { setApiError('正しいメールアドレスを入力してください'); return; }
                setApiError('');
                setForgotPasswordLoading(true);
                const res = await apiForgotPassword(resetEmail);
                setForgotPasswordLoading(false);
                if (res.ok) { setCurrentView('reset-link-sent'); } else { setApiError(res.error || '送信に失敗しました'); }
              }}
              className="w-full bg-slate-800 text-white py-3.5 rounded-lg font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
            >
              {forgotPasswordLoading ? '送信中...' : '再設定リンクを送信'}
            </button>

            <button onClick={() => { setResetEmail(''); setCurrentView('welcome'); }} className="w-full bg-white border border-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-50 transition-colors">
              ログイン画面に戻る
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderResetLinkSentView = () => (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      {renderAuthLeftPanel()}
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-md text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
            <MessageCircle size={28} className="text-gray-500" />
          </div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">メールを送信しました</h2>
          <p className="text-gray-600 mb-6">
            <strong>{resetEmail}</strong> 宛に<br />
            パスワード再設定用のリンクを送信しました。
          </p>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-sm text-gray-700 mb-2"><strong>次の手順：</strong></p>
            <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
              <li>メールボックスを確認してください</li>
              <li>メール内のリンクをクリック</li>
              <li>新しいパスワードを設定</li>
            </ol>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-gray-600">
              ⚠️ メールが届かない場合は、迷惑メールフォルダもご確認ください。<br />
              リンクの有効期限は1時間です。
            </p>
          </div>

          <button onClick={() => { setResetEmail(''); setCurrentView('welcome'); }} className="text-indigo-600 text-sm hover:text-indigo-500 font-medium">
            ログイン画面に戻る
          </button>
        </div>
      </div>
    </div>
  );

  const renderResetPasswordView = () => {
    const validatePassword = () => {
      if (newPassword.length < 8) {
        setPasswordError('パスワードは8文字以上で設定してください');
        return false;
      }
      if (newPassword !== newPasswordConfirm) {
        setPasswordError('パスワードが一致しません');
        return false;
      }
      setPasswordError('');
      return true;
    };

    if (!resetToken) {
      return (
        <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
          {renderAuthLeftPanel()}
          <div className="flex-1 flex items-center justify-center bg-white p-6">
            <div className="w-full max-w-md text-center">
              <h2 className="text-2xl font-bold mb-4 text-gray-900">無効なリンクです</h2>
              <p className="text-gray-600 mb-6">
                パスワード再設定は、メールでお送りしたリンクから行ってください。<br />
                リンクの有効期限は1時間です。
              </p>
              <button onClick={() => setCurrentView('welcome')} className="w-full bg-slate-800 text-white py-3.5 rounded-lg font-semibold hover:bg-slate-700">
                トップに戻る
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
        {renderAuthLeftPanel()}
        <div className="flex-1 flex items-center justify-center bg-white p-6">
          <div className="w-full max-w-md">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold mb-1 text-gray-900">新しいパスワードを設定</h2>
              <p className="text-gray-500 text-sm">8文字以上の新しいパスワードを入力してください</p>
            </div>

            {apiError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{apiError}</div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">新しいパスワード</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setApiError(''); }}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="8文字以上"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">新しいパスワード（確認）</label>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPasswordConfirm}
                  onChange={(e) => setNewPasswordConfirm(e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
                  placeholder="もう一度入力してください"
                />
                {passwordError && <p className="text-xs text-red-600 mt-1">{passwordError}</p>}
              </div>

              <div className="flex items-center">
                <input type="checkbox" checked={showPassword} onChange={(e) => setShowPassword(e.target.checked)} className="mr-2" />
                <label className="text-sm text-gray-600">パスワードを表示する</label>
              </div>

              <button
                disabled={resetPasswordLoading}
                onClick={async () => {
                  if (!newPassword || !newPasswordConfirm) { setApiError('すべての項目を入力してください'); return; }
                  if (!validatePassword()) return;
                  setApiError('');
                  setResetPasswordLoading(true);
                  const res = await apiResetPassword(resetToken, newPassword);
                  setResetPasswordLoading(false);
                  if (res.ok && res.success !== false) { setResetToken(''); setNewPassword(''); setNewPasswordConfirm(''); setCurrentView('password-reset-complete'); }
                  else { setApiError(res.error || 'パスワードの変更に失敗しました'); }
                }}
                className="w-full bg-slate-800 text-white py-3.5 rounded-lg font-semibold hover:bg-slate-700 transition-colors disabled:opacity-50"
              >
                {resetPasswordLoading ? '変更中...' : 'パスワードを変更する'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPasswordResetCompleteView = () => (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      {renderAuthLeftPanel()}
      <div className="flex-1 flex items-center justify-center bg-white p-6">
        <div className="w-full max-w-md text-center">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-bold mb-4 text-gray-900">パスワードを変更しました</h2>
          <p className="text-gray-600 mb-6">
            パスワードの変更が完了しました。<br />
            新しいパスワードでログインしてください。
          </p>

          <div className="bg-green-50 border-l-4 border-green-500 p-4 mb-6 text-left">
            <p className="text-sm text-green-800">
              ✓ パスワードが正常に変更されました<br />
              ✓ 次回ログイン時から新しいパスワードをご利用ください
            </p>
          </div>

          <button
            onClick={() => { setResetEmail(''); setNewPassword(''); setNewPasswordConfirm(''); setCurrentView('welcome'); }}
            className="w-full bg-slate-800 text-white py-3.5 rounded-lg font-semibold hover:bg-slate-700 transition-colors"
          >
            ログイン画面へ
          </button>
        </div>
      </div>
    </div>
  );

  if (currentView === 'welcome') return renderWelcomeView();
  if (currentView === 'login') return renderLoginView();
  if (currentView === 'register') return renderRegistrationView();
  if (currentView === 'registration-complete') return renderRegistrationCompleteView();
  if (currentView === 'forgot-password') return renderForgotPasswordView();
  if (currentView === 'reset-link-sent') return renderResetLinkSentView();
  if (currentView === 'reset-password') return renderResetPasswordView();
  if (currentView === 'password-reset-complete') return renderPasswordResetCompleteView();

  const handleLogout = () => {
    setStoredToken(null);
    setIsLoggedIn(false);
    setIsAdmin(false);
    setCurrentUserProfile(null);
    setCurrentView('welcome');
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Sidebar */}
      {isLoggedIn && (
        <>
          <aside className={`fixed inset-y-0 left-0 z-30 w-64 bg-slate-900 text-white flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
            <div className="flex items-center gap-3 px-6 py-5 border-b border-slate-800">
              <div className="w-9 h-9 bg-yellow-400 rounded-lg flex items-center justify-center flex-shrink-0">
                <span className="text-slate-900 font-black text-lg">Y</span>
              </div>
              <span className="text-lg font-bold tracking-tight">YCS Business Network</span>
              <button onClick={() => setSidebarOpen(false)} className="ml-auto lg:hidden text-slate-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto sidebar-scroll">
              <button onClick={() => { setCurrentView('home'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'home' || currentView === 'profile' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <LayoutGrid size={20} />
                Directory
              </button>
              <button onClick={() => { setCurrentView('mypage'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${currentView === 'mypage' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                <User size={20} />
                My Profile
              </button>
              {isAdmin && (
                <button onClick={() => { setCurrentView('admin'); setSidebarOpen(false); }} className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${['admin', 'admin-settings', 'admin-detail'].includes(currentView) ? 'bg-slate-800 text-white' : 'text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
                  <Shield size={20} />
                  Admin
                </button>
              )}
            </nav>
            <div className="px-3 py-4 border-t border-slate-800">
              <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:bg-slate-800 hover:text-white transition-colors">
                <LogOut size={20} />
                Sign Out
              </button>
            </div>
          </aside>
          {sidebarOpen && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />}
        </>
      )}
      {/* Main content area */}
      <div className="flex-1 flex flex-col min-h-screen overflow-auto">
        {/* Mobile top bar */}
        {isLoggedIn && (
          <div className="lg:hidden sticky top-0 z-10 bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
            <button onClick={() => setSidebarOpen(true)} className="text-gray-600 hover:text-gray-900">
              <Menu size={24} />
            </button>
            <span className="font-bold text-gray-800">YCS Business Network</span>
            <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden">
              {currentUserProfile?.profileImage ? (
                <img src={currentUserProfile.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={16} /></div>
              )}
            </div>
          </div>
        )}
      {currentView === 'home' && (
        <div className="p-6 lg:p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Network Directory</h1>
              <p className="text-sm text-gray-500 mt-1">Find and connect with business professionals.</p>
            </div>
            <div className="hidden lg:block w-10 h-10 rounded-full bg-slate-200 overflow-hidden">
              {currentUserProfile?.profileImage ? (
                <img src={currentUserProfile.profileImage} alt="" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={20} /></div>
              )}
            </div>
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-3 mb-6">
            <div className="flex-1 relative">
              <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={keywordSearch}
                onChange={(e) => setKeywordSearch(e.target.value)}
                placeholder="Search by name, industry, skill..."
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
            <button onClick={() => setCurrentView('search')} className="p-2.5 bg-white border border-gray-200 rounded-lg text-gray-500 hover:bg-gray-50">
              <SlidersHorizontal size={18} />
            </button>
          </div>

          {/* Table */}
          {membersLoading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw size={24} className="animate-spin text-gray-400" />
            </div>
          ) : (
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 bg-gray-50/50">
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Professional</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Industry & Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Location</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Match Score</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filterByKeyword(membersList, keywordSearch).filter(u => u.id !== currentUserProfile?.id).map(user => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => { setSelectedUser(user); setCurrentView('profile'); }}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                            {(user.profileImage ?? (user as UserProfile & { profileImageUrl?: string }).profileImageUrl) ? (
                              <img src={(user.profileImage ?? (user as UserProfile & { profileImageUrl?: string }).profileImageUrl) as string} alt={user.name} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={20} /></div>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-gray-900">{user.name}</p>
                            <p className="text-xs text-gray-500">{user.businessName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <p className="text-sm font-medium text-gray-900">{user.industry}</p>
                        <p className="text-xs text-gray-500 truncate max-w-[200px]">{(user as UserProfile & { business?: string }).business ?? ''}</p>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        <div className="flex items-center gap-1.5 text-sm text-gray-600">
                          <MapPin size={14} className="text-gray-400 flex-shrink-0" />
                          <span>{user.region}{user.city ? `・${user.city}` : ''}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(user as UserProfile & { matchScore?: number }).matchScore ?? 0}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{(user as UserProfile & { matchScore?: number }).matchScore ?? 0}%</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 hidden lg:table-cell">
                        <button className="text-sm text-indigo-600 hover:text-indigo-500 font-medium">View</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {currentView === 'mypage' && currentUserProfile && (
        <div className="p-6 lg:p-8">
          <div className="max-w-3xl mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
                <h2 className="text-lg font-bold text-gray-900">My Profile</h2>
                {!isEditMode ? (
                  <button
                    onClick={() => {
                      setIsEditMode(true);
                      setFormData({
                        ...formData,
                        name: currentUserProfile.name,
                        email: currentUserProfile.email,
                        phone: currentUserProfile.phone,
                        chatworkId: currentUserProfile.chatworkId,
                        sns1Type: currentUserProfile.sns1Type,
                        sns1Account: currentUserProfile.sns1Account,
                        sns2Type: currentUserProfile.sns2Type,
                        sns2Account: currentUserProfile.sns2Account,
                        sns3Type: currentUserProfile.sns3Type,
                        sns3Account: currentUserProfile.sns3Account,
                        businessName: currentUserProfile.businessName,
                        industry: currentUserProfile.industry,
                        businessDescription: currentUserProfile.business,
                        country: currentUserProfile.country,
                        region: currentUserProfile.region,
                        city: currentUserProfile.city,
                        skills: currentUserProfile.skills,
                        interests: currentUserProfile.interests,
                        message: currentUserProfile.message,
                        mission: currentUserProfile.mission,
                        profileImage: null,
                        profileImagePreview: currentUserProfile.profileImage || null
                      });
                    }}
                    className="text-sm text-gray-500 hover:text-gray-800 flex items-center gap-1.5 transition-colors"
                  >
                    <Edit2 size={14} />
                    Edit
                  </button>
                ) : (
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsEditMode(false)}
                      className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={() => {
                        setCurrentUserProfile({
                          ...currentUserProfile,
                          name: formData.name,
                          email: formData.email,
                          phone: formData.phone,
                          chatworkId: formData.chatworkId,
                          sns1Type: formData.sns1Type,
                          sns1Account: formData.sns1Account,
                          sns2Type: formData.sns2Type,
                          sns2Account: formData.sns2Account,
                          sns3Type: formData.sns3Type,
                          sns3Account: formData.sns3Account,
                          businessName: formData.businessName,
                          industry: formData.industry,
                          business: formData.businessDescription,
                          country: formData.country,
                          region: formData.region,
                          city: formData.city,
                          location: `${formData.region}・${formData.city}`,
                          skills: formData.skills,
                          interests: formData.interests,
                          message: formData.message,
                          mission: formData.mission,
                          profileImage: formData.profileImagePreview || currentUserProfile.profileImage
                        });
                        setIsEditMode(false);
                      }}
                      className="text-sm bg-slate-800 text-white px-3 py-1.5 rounded-md hover:bg-slate-700 transition-colors flex items-center gap-1.5"
                    >
                      <Save size={14} />
                      Save
                    </button>
                  </div>
                )}
              </div>

              <div className="px-6 pb-8 space-y-6">
                {currentUserProfile ? (
                  <>
                    {/* Avatar & Name */}
                    <div className="text-center pt-6">
                      <div className="relative inline-block">
                        <div className="w-20 h-20 mx-auto rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                          {formData.profileImagePreview || currentUserProfile?.profileImage ? (
                            <img
                              src={formData.profileImagePreview || currentUserProfile.profileImage || undefined}
                              alt={currentUserProfile?.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={36} /></div>
                          )}
                        </div>
                        {isEditMode && (
                          <label className="absolute bottom-0 right-0 bg-slate-800 text-white rounded-full p-1.5 cursor-pointer hover:bg-slate-700 transition-colors">
                            <Plus size={14} />
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                            />
                          </label>
                        )}
                      </div>
                      {isEditMode ? (
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleInputChange}
                          className="mt-3 text-center text-lg font-semibold border border-gray-300 rounded-md px-3 py-1.5 w-64 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      ) : (
                        <h3 className="mt-3 text-lg font-semibold text-gray-900">{currentUserProfile.name}</h3>
                      )}
                      {currentUserProfile.businessName && (
                        <p className="text-sm text-gray-500 mt-0.5">{currentUserProfile.businessName}</p>
                      )}
                      <p className="text-xs text-gray-400 mt-1">Registered: {currentUserProfile.registeredAt}</p>
                    </div>

                    {/* Mission */}
                    {(isEditMode || currentUserProfile.mission) && (
                      <div>
                        <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">MISSION</p>
                        {isEditMode ? (
                          <textarea
                            name="mission"
                            value={formData.mission}
                            onChange={handleInputChange}
                            className="w-full p-3 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 h-20"
                            placeholder="価値観やミッションを入力..."
                          />
                        ) : (
                          <p className="text-sm text-gray-700 leading-relaxed">{currentUserProfile.mission}</p>
                        )}
                      </div>
                    )}

                    {/* Contact */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">CONTACT</p>
                      {isEditMode ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Email</label>
                              <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleInputChange}
                                className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Phone</label>
                              <input
                                type="tel"
                                name="phone"
                                value={formData.phone}
                                onChange={handleInputChange}
                                className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Chatwork ID</label>
                            <input
                              type="text"
                              name="chatworkId"
                              value={formData.chatworkId}
                              onChange={handleInputChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm">
                          <div>
                            <span className="text-gray-400">Email</span>
                            <p className="text-gray-800">{currentUserProfile.email}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Phone</span>
                            <p className="text-gray-800">{currentUserProfile.phone || '-'}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Chatwork ID</span>
                            <p className="text-gray-800">{currentUserProfile.chatworkId || '-'}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* SNS */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">SNS</p>
                      {isEditMode ? (
                        <div className="space-y-2">
                          {[1, 2, 3].map(num => (
                            <div key={num} className="grid grid-cols-3 gap-2">
                              <select
                                name={`sns${num}Type`}
                                value={formData[`sns${num}Type`]}
                                onChange={handleInputChange}
                                className="p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="">SNS選択</option>
                                <option value="𝕏 (Twitter)">𝕏 (Twitter)</option>
                                <option value="Facebook">Facebook</option>
                                <option value="Instagram">Instagram</option>
                                <option value="YouTube">YouTube</option>
                                <option value="TikTok">TikTok</option>
                                <option value="LINE">LINE</option>
                                <option value="LinkedIn">LinkedIn</option>
                                <option value="Note">Note</option>
                                <option value="その他">その他</option>
                              </select>
                              <input
                                type="text"
                                name={`sns${num}Account`}
                                value={formData[`sns${num}Account`]}
                                onChange={handleInputChange}
                                className="col-span-2 p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                placeholder="アカウント名またはURL"
                                disabled={!formData[`sns${num}Type`]}
                              />
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="space-y-1 text-sm">
                          {currentUserProfile.sns1Type && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 w-28">{currentUserProfile.sns1Type}</span>
                              <span className="text-gray-800">{currentUserProfile.sns1Account}</span>
                            </div>
                          )}
                          {currentUserProfile.sns2Type && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 w-28">{currentUserProfile.sns2Type}</span>
                              <span className="text-gray-800">{currentUserProfile.sns2Account}</span>
                            </div>
                          )}
                          {currentUserProfile.sns3Type && (
                            <div className="flex items-center gap-2">
                              <span className="text-gray-400 w-28">{currentUserProfile.sns3Type}</span>
                              <span className="text-gray-800">{currentUserProfile.sns3Account}</span>
                            </div>
                          )}
                          {!currentUserProfile.sns1Type && !currentUserProfile.sns2Type && !currentUserProfile.sns3Type && (
                            <p className="text-gray-400">-</p>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Business */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">BUSINESS</p>
                      {isEditMode ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Business Name</label>
                              <input
                                type="text"
                                name="businessName"
                                value={formData.businessName}
                                onChange={handleInputChange}
                                className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Industry</label>
                              <select
                                name="industry"
                                value={formData.industry}
                                onChange={handleInputChange}
                                className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              >
                                <option value="">選択してください</option>
                                <option value="it">IT・テクノロジー</option>
                                <option value="manufacturing">製造業</option>
                                <option value="retail">小売・EC</option>
                                <option value="food">飲食業</option>
                                <option value="consulting">コンサルティング</option>
                                <option value="other">その他</option>
                              </select>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Description</label>
                            <textarea
                              name="businessDescription"
                              value={formData.businessDescription}
                              onChange={handleInputChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm h-20 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-y-2 gap-x-8 text-sm">
                          <div>
                            <span className="text-gray-400">Business Name</span>
                            <p className="text-gray-800">{currentUserProfile.businessName || '-'}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Industry</span>
                            <p className="text-gray-800">{currentUserProfile.industry || '-'}</p>
                          </div>
                          <div className="md:col-span-2">
                            <span className="text-gray-400">Description</span>
                            <p className="text-gray-800">{currentUserProfile.business || '-'}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Location */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">LOCATION</p>
                      {isEditMode ? (
                        <div className="grid grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Country</label>
                            <input
                              type="text"
                              name="country"
                              value={formData.country}
                              onChange={handleInputChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">Region</label>
                            <input
                              type="text"
                              name="region"
                              value={formData.region}
                              onChange={handleInputChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-500 mb-1">City</label>
                            <input
                              type="text"
                              name="city"
                              value={formData.city}
                              onChange={handleInputChange}
                              className="w-full p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="grid grid-cols-3 gap-x-8 text-sm">
                          <div>
                            <span className="text-gray-400">Country</span>
                            <p className="text-gray-800">{currentUserProfile.country || '-'}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">Region</span>
                            <p className="text-gray-800">{currentUserProfile.region || '-'}</p>
                          </div>
                          <div>
                            <span className="text-gray-400">City</span>
                            <p className="text-gray-800">{currentUserProfile.city || '-'}</p>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Skills */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">SKILLS & EXPERTISE</p>
                      {isEditMode ? (
                        <div>
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              id="skill-input"
                              className="flex-1 p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="スキルを追加"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addSkill((e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById('skill-input') as HTMLInputElement;
                                if (input && input.value.trim()) {
                                  addSkill(input.value);
                                  input.value = '';
                                }
                              }}
                              className="bg-slate-800 text-white px-3 rounded-md hover:bg-slate-700 transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.skills.map((skill, idx) => (
                              <span key={idx} className="border border-gray-300 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-1.5">
                                {skill}
                                <button onClick={() => removeSkill(skill)} className="text-gray-400 hover:text-gray-600">
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {currentUserProfile.skills && currentUserProfile.skills.length > 0 ? (
                            currentUserProfile.skills.map((skill, idx) => (
                              <span key={idx} className="border border-gray-300 text-gray-700 px-3 py-1 rounded-full text-sm">
                                {skill}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Interests */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">INTERESTS</p>
                      {isEditMode ? (
                        <div>
                          <div className="flex gap-2 mb-3">
                            <input
                              type="text"
                              id="interest-input"
                              className="flex-1 p-2.5 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              placeholder="興味を追加"
                              onKeyPress={(e) => {
                                if (e.key === 'Enter') {
                                  addInterest((e.target as HTMLInputElement).value);
                                  (e.target as HTMLInputElement).value = '';
                                }
                              }}
                            />
                            <button
                              onClick={() => {
                                const input = document.getElementById('interest-input') as HTMLInputElement;
                                if (input && input.value.trim()) {
                                  addInterest(input.value);
                                  input.value = '';
                                }
                              }}
                              className="bg-slate-800 text-white px-3 rounded-md hover:bg-slate-700 transition-colors"
                            >
                              <Plus size={16} />
                            </button>
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {formData.interests.map((interest, idx) => (
                              <span key={idx} className="border border-gray-300 text-gray-700 px-3 py-1 rounded-full text-sm flex items-center gap-1.5">
                                {interest}
                                <button onClick={() => removeInterest(interest)} className="text-gray-400 hover:text-gray-600">
                                  <X size={12} />
                                </button>
                              </span>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {currentUserProfile.interests && currentUserProfile.interests.length > 0 ? (
                            currentUserProfile.interests.map((interest, idx) => (
                              <span key={idx} className="border border-gray-300 text-gray-700 px-3 py-1 rounded-full text-sm">
                                {interest}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 text-sm">-</span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Message */}
                    <div>
                      <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">MESSAGE</p>
                      {isEditMode ? (
                        <textarea
                          name="message"
                          value={formData.message}
                          onChange={handleInputChange}
                          className="w-full p-3 border border-gray-300 rounded-md text-sm h-28 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          placeholder="メンバーへのメッセージを入力..."
                        />
                      ) : (
                        <p className="text-sm text-gray-700 leading-relaxed">
                          {currentUserProfile.message || '-'}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-gray-500 text-sm">プロフィール情報が読み込まれていません</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'profile' && selectedUser && (
        <div className="p-6 lg:p-8">
          <div className="max-w-lg mx-auto">
            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between px-6 pt-5 pb-3">
                <h2 className="text-lg font-bold text-gray-900">Profile Details</h2>
                <button onClick={() => setCurrentView('home')} className="text-gray-400 hover:text-gray-600">
                  <X size={20} />
                </button>
              </div>

              <div className="px-6 pb-8 space-y-6">
                {/* Avatar & Name */}
                <div className="text-center pt-2">
                  <div className="w-24 h-24 mx-auto mb-3 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200">
                    {selectedUser.profileImage ? (
                      <img src={selectedUser.profileImage} alt={selectedUser.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-4xl text-gray-400"><User size={40} /></div>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">{selectedUser.name}</h3>
                  <p className="text-sm text-gray-500">{selectedUser.businessName}</p>
                  {selectedUser.chatworkId && (
                    <a
                      href={`https://www.chatwork.com/#!rid${selectedUser.chatworkId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 mt-3 bg-indigo-600 text-white px-5 py-2 rounded-lg text-sm font-medium hover:bg-indigo-500 transition-colors"
                    >
                      <MessageCircle size={16} />
                      Message
                    </a>
                  )}
                </div>

                {/* About */}
                {selectedUser.message && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">About</p>
                    <div className="bg-gray-50 rounded-lg p-4">
                      <p className="text-sm text-gray-700 leading-relaxed">{selectedUser.message}</p>
                    </div>
                  </div>
                )}

                {/* Mission */}
                {selectedUser.mission && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mission</p>
                    <div className="border-l-3 border-indigo-400 pl-4">
                      <p className="text-sm text-gray-700 italic leading-relaxed">"{selectedUser.mission}"</p>
                    </div>
                  </div>
                )}

                {/* Industry & Location */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Industry</p>
                    <p className="text-sm text-gray-900">{selectedUser.industry}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1">Location</p>
                    <p className="text-sm text-gray-900">{selectedUser.region}{selectedUser.city ? `・${selectedUser.city}` : ''}</p>
                  </div>
                </div>

                {/* Skills */}
                {selectedUser.skills && selectedUser.skills.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Skills & Expertise</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.skills.map((skill, idx) => (
                        <span key={idx} className="border border-gray-300 text-gray-700 px-3 py-1 rounded-full text-sm">{skill}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Interests */}
                {selectedUser.interests && selectedUser.interests.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Interests</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedUser.interests.map((interest, idx) => (
                        <span key={idx} className="border border-indigo-300 text-indigo-700 px-3 py-1 rounded-full text-sm">{interest}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Contact Info */}
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Contact</p>
                  <div className="space-y-2 text-sm">
                    {selectedUser.chatworkId && (
                      <p className="text-gray-700"><span className="font-medium text-gray-500">Chatwork:</span> {selectedUser.chatworkId}</p>
                    )}
                    {selectedUser.sns1Type && (
                      <p className="text-gray-700"><span className="font-medium text-gray-500">{selectedUser.sns1Type}:</span> {selectedUser.sns1Account}</p>
                    )}
                    {selectedUser.sns2Type && (
                      <p className="text-gray-700"><span className="font-medium text-gray-500">{selectedUser.sns2Type}:</span> {selectedUser.sns2Account}</p>
                    )}
                    {selectedUser.sns3Type && (
                      <p className="text-gray-700"><span className="font-medium text-gray-500">{selectedUser.sns3Type}:</span> {selectedUser.sns3Account}</p>
                    )}
                  </div>
                </div>

                {/* Match Score */}
                <div className="border-t pt-4">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Match Score</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Business</span>
                      <span className="text-gray-500">{renderStars(selectedUser.businessScore)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Location</span>
                      <span className="text-gray-500">{renderStars(selectedUser.locationScore)}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600">Interests</span>
                      <span className="text-gray-500">{renderStars(selectedUser.interestScore)}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'search' && (
        <div className="p-6 lg:p-8">
          <div className="max-w-4xl space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Search Members</h1>
              <p className="text-sm text-gray-500 mt-1">Filter and find the right business partners.</p>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h3 className="text-xl font-bold mb-4">検索条件</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center">
                    <Briefcase size={18} className="mr-2 text-indigo-600" />
                    ビジネス（業種）
                  </label>
                  <input 
                    type="text"
                    name="industry"
                    value={searchFilters.industry}
                    onChange={handleSearchFilterChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none"
                    placeholder="例：IT、製造業、飲食業"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center">
                    <MapPin size={18} className="mr-2 text-green-600" />
                    地域（都道府県・市区町村）
                  </label>
                  <input 
                    type="text"
                    name="region"
                    value={searchFilters.region}
                    onChange={handleSearchFilterChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-green-500 focus:outline-none"
                    placeholder="例：東京、港区、横浜"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center">
                    <TrendingUp size={18} className="mr-2 text-purple-600" />
                    提供できる価値・スキル
                  </label>
                  <input 
                    type="text"
                    name="skill"
                    value={searchFilters.skill}
                    onChange={handleSearchFilterChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 focus:outline-none"
                    placeholder="例：マーケティング、資金調達、DX"
                  />
                </div>

                <div>
                  <label className="block text-sm font-semibold mb-2 flex items-center">
                    <Heart size={18} className="mr-2 text-pink-600" />
                    興味・関心
                  </label>
                  <input 
                    type="text"
                    name="interest"
                    value={searchFilters.interest}
                    onChange={handleSearchFilterChange}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:border-pink-500 focus:outline-none"
                    placeholder="例：ゴルフ、DX推進、SNSマーケティング"
                  />
                </div>

                <button
                  onClick={() => {
                    performSearch();
                  }}
                  className="w-full bg-slate-800 text-white py-3.5 rounded-lg font-semibold hover:bg-slate-700 transition-colors text-lg flex items-center justify-center gap-2"
                >
                  <Search size={24} />
                  検索する
                </button>

                <button
                  onClick={() => {
                    setSearchFilters({
                      industry: '',
                      region: '',
                      skill: '',
                      interest: ''
                    });
                    setSearchResults([]);
                  }}
                  className="w-full bg-gray-300 text-gray-700 py-3 rounded-lg font-bold hover:bg-gray-400 transition-colors"
                >
                  条件をクリア
                </button>
              </div>
            </div>

            {searchResults.length > 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6">
                <h3 className="text-xl font-bold mb-4">
                  検索結果（{searchResults.length}件）
                </h3>
                <div className="space-y-4">
                  {searchResults.map(user => (
                    <div 
                      key={user.id}
                      className="bg-white border-2 border-gray-200 rounded-xl p-5 shadow-md hover:shadow-xl transition-shadow cursor-pointer"
                      onClick={() => {
                        setSelectedUser(user);
                        setCurrentView('profile');
                      }}
                    >
                      <div className="flex items-start space-x-4">
                        <div className="w-20 h-20 rounded-full overflow-hidden bg-gray-200 flex-shrink-0">
                          {(user.profileImage ?? (user as UserProfile & { profileImageUrl?: string }).profileImageUrl) ? (
                            <img src={(user.profileImage ?? (user as UserProfile & { profileImageUrl?: string }).profileImageUrl) as string} alt={user.name} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={20} /></div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="text-xl font-bold">{user.name}</h4>
                            <div className="bg-indigo-50 text-indigo-700 px-3 py-1 rounded-full font-bold">
                              {(user as UserProfile & { matchScore?: number }).matchScore ?? 0}%
                            </div>
                          </div>
                          
                          <div className="space-y-2 text-sm">
                            <p className="flex items-center text-gray-700">
                              <Briefcase size={16} className="mr-2" />
                              {(user as UserProfile & { business?: string }).business ?? user.businessName ?? ''} - {user.industry}
                            </p>
                            <p className="flex items-center text-gray-700">
                              <MapPin size={16} className="mr-2" />
                              {(user as UserProfile & { location?: string }).location ?? `${user.region}・${user.city}`}
                            </p>
                            <div className="flex flex-wrap gap-2 mt-2">
                              {user.skills.slice(0, 3).map((skill, idx) => (
                                <span key={idx} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-full text-xs">
                                  {skill}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {searchResults.length === 0 && searchFilters.industry === '' && searchFilters.region === '' && searchFilters.skill === '' && searchFilters.interest === '' ? null : searchResults.length === 0 && (
              <div className="bg-white rounded-xl shadow-lg p-6 text-center">
                <p className="text-gray-600 text-lg">条件に一致するメンバーが見つかりませんでした</p>
                <p className="text-sm text-gray-500 mt-2">別の条件で検索してみてください</p>
              </div>
            )}
          </div>
        </div>
      )}

      {currentView === 'admin' && (
        <div className="p-6 lg:p-8">
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
              <p className="text-sm text-gray-500 mt-1">Manage users, settings, and platform data.</p>
            </div>

            {apiError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm font-medium text-red-800 mb-1">API Error</p>
                <pre className="text-sm text-red-700 whitespace-pre-wrap break-all">{apiError}</pre>
                <button type="button" onClick={() => setApiError('')} className="mt-2 text-sm text-red-600 hover:underline font-medium">Dismiss</button>
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <div className="bg-white border border-gray-200 p-5 rounded-lg">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{adminUsersList.length}</p>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-lg">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">New This Month</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">{(() => {
                  const now = new Date();
                  const ym = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
                  return adminUsersList.filter((u) => u.registeredAt?.startsWith(ym)).length;
                })()}</p>
              </div>
              <div className="bg-white border border-gray-200 p-5 rounded-lg">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Total Matches</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">47</p>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setAdminRefreshKey((k) => k + 1)}
                className="bg-slate-800 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors flex items-center gap-2"
              >
                <RefreshCw size={16} />
                Refresh
              </button>
              <button
                onClick={downloadCSV}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Download size={16} />
                Export CSV
              </button>
              <button
                onClick={() => setCurrentView('admin-settings')}
                className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors flex items-center gap-2"
              >
                <Shield size={16} />
                Settings
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <h3 className="text-base font-bold text-gray-900">Users</h3>
                {selectedUserIds.size > 0 && (
                  <button
                    onClick={handleBulkDelete}
                    disabled={bulkDeleting}
                    className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Trash2 size={14} />
                    {bulkDeleting ? 'Deleting...' : `Delete ${selectedUserIds.size} selected`}
                  </button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-200 bg-gray-50/50">
                      <th className="px-3 py-3 text-center text-sm font-semibold w-10">
                        <input
                          type="checkbox"
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                          checked={adminUsersList.length > 0 && adminUsersList.every((u) => selectedUserIds.has(u.id))}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedUserIds(new Set(adminUsersList.map((u) => u.id)));
                            } else {
                              setSelectedUserIds(new Set());
                            }
                          }}
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Business</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Industry</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Region</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Registered</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {adminUsersList.map((user) => (
                      <tr
                        key={user.id}
                        className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedUserIds.has(user.id) ? 'bg-indigo-50/50' : ''}`}
                      >
                        <td className="px-3 py-3 text-center">
                          <input
                            type="checkbox"
                            className="w-4 h-4 accent-indigo-600 cursor-pointer rounded"
                            checked={selectedUserIds.has(user.id)}
                            onChange={(e) => {
                              setSelectedUserIds((prev) => {
                                const next = new Set(prev);
                                if (e.target.checked) {
                                  next.add(user.id);
                                } else {
                                  next.delete(user.id);
                                }
                                return next;
                              });
                            }}
                          />
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">{user.id}</td>
                        <td className="px-4 py-3 text-sm font-medium text-gray-900">{user.name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{user.email}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{user.businessName}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden lg:table-cell">{user.industry}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 hidden md:table-cell">{user.region}</td>
                        <td className="px-4 py-3 text-sm text-gray-500 hidden md:table-cell">{user.registeredAt}</td>
                        <td className="px-4 py-3 text-sm">
                          {user.role === 'admin' ? (
                            <span className="inline-flex items-center gap-1 bg-slate-800 text-white px-2 py-0.5 rounded text-xs font-medium">
                              Admin
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">
                              User
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                setSelectedUser(user);
                                setCurrentView('admin-detail');
                              }}
                              className="text-indigo-600 hover:text-indigo-500 text-xs font-medium"
                            >
                              View
                            </button>
                            <button
                              onClick={() => {
                                const newRole = user.role === 'admin' ? 'user' : 'admin';
                                const action = newRole === 'admin' ? '管理者に昇格' : '一般ユーザーに降格';
                                if (!confirm(`${user.name}（${user.email}）を${action}しますか？`)) return;
                                apiUpdateRole(user.id, newRole).then((res) => {
                                  if (res.ok && res.success) {
                                    setAdminUsersList((prev) => prev.map((u) => u.id === user.id ? { ...u, role: newRole } : u));
                                  } else {
                                    alert(res.error || '権限変更に失敗しました');
                                  }
                                });
                              }}
                              disabled={currentUserProfile?.id === user.id}
                              className="text-gray-500 hover:text-gray-700 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              {user.role === 'admin' ? 'Demote' : 'Promote'}
                            </button>
                            <button
                              onClick={() => {
                                if (!confirm(`${user.name}（${user.email}）を退会者として削除しますか？\nこの操作は取り消せません。`)) return;
                                apiDeleteUser(user.id).then((res) => {
                                  if (res.ok && res.success) {
                                    setAdminUsersList((prev) => prev.filter((u) => u.id !== user.id));
                                    setSelectedUserIds((prev) => { const next = new Set(prev); next.delete(user.id); return next; });
                                  } else {
                                    alert(res.error || '削除に失敗しました');
                                  }
                                });
                              }}
                              disabled={currentUserProfile?.id === user.id}
                              className="text-red-500 hover:text-red-700 text-xs font-medium disabled:opacity-40 disabled:cursor-not-allowed"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'admin-settings' && (
        <div className="p-6 lg:p-8">
          <div className="max-w-2xl space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
                <p className="text-sm text-gray-500 mt-1">Admin configuration and platform settings.</p>
              </div>
              <button
                onClick={() => setCurrentView('admin')}
                className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
              >
                Back to Dashboard
              </button>
            </div>

            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <p className="text-sm text-gray-700 font-medium mb-1">Admin Login</p>
                <p className="text-xs text-gray-500">
                  管理者はトップの「ログイン」から、role=admin のアカウントでメール・パスワードを入力してログインします。
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {currentView === 'admin-detail' && selectedUser && (
        <div className="p-6 lg:p-8">
          <div className="max-w-4xl space-y-6">
            <button
              onClick={() => setCurrentView('admin')}
              className="text-sm text-indigo-600 hover:text-indigo-500 font-medium"
            >
              Back to Users
            </button>

            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-200">
                <div className="w-16 h-16 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                  {(selectedUser.profileImage ?? (selectedUser as UserProfile & { profileImageUrl?: string }).profileImageUrl) ? (
                    <img src={(selectedUser.profileImage ?? (selectedUser as UserProfile & { profileImageUrl?: string }).profileImageUrl) as string} alt={selectedUser.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400"><User size={28} /></div>
                  )}
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-900">{selectedUser.name}</h2>
                  <p className="text-sm text-gray-500">ID: {selectedUser.id} / Registered: {selectedUser.registeredAt}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Contact</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700"><span className="font-medium text-gray-500">Email:</span> {selectedUser.email}</p>
                    <p className="text-gray-700"><span className="font-medium text-gray-500">Phone:</span> {selectedUser.phone}</p>
                    <p className="text-gray-700"><span className="font-medium text-gray-500">Chatwork:</span> {selectedUser.chatworkId || '-'}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">SNS</p>
                  <div className="space-y-2 text-sm">
                    {selectedUser.sns1Type && (
                      <p className="text-gray-700"><span className="font-medium text-gray-500">{selectedUser.sns1Type}:</span> {selectedUser.sns1Account}</p>
                    )}
                    {selectedUser.sns2Type && (
                      <p className="text-gray-700"><span className="font-medium text-gray-500">{selectedUser.sns2Type}:</span> {selectedUser.sns2Account}</p>
                    )}
                    {selectedUser.sns3Type && (
                      <p className="text-gray-700"><span className="font-medium text-gray-500">{selectedUser.sns3Type}:</span> {selectedUser.sns3Account}</p>
                    )}
                    {!selectedUser.sns1Type && !selectedUser.sns2Type && !selectedUser.sns3Type && (
                      <p className="text-gray-400 text-sm">-</p>
                    )}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Business</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700"><span className="font-medium text-gray-500">Name:</span> {selectedUser.businessName}</p>
                    <p className="text-gray-700"><span className="font-medium text-gray-500">Industry:</span> {selectedUser.industry}</p>
                    <p className="text-gray-700"><span className="font-medium text-gray-500">Description:</span> {(selectedUser as UserProfile & { business?: string }).business ?? selectedUser.businessName ?? ''}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Location</p>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-700"><span className="font-medium text-gray-500">Country:</span> {selectedUser.country}</p>
                    <p className="text-gray-700"><span className="font-medium text-gray-500">Region:</span> {selectedUser.region}</p>
                    <p className="text-gray-700"><span className="font-medium text-gray-500">City:</span> {selectedUser.city}</p>
                  </div>
                </div>

                <div className="col-span-2">
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Message</p>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-sm text-gray-700">
                      {selectedUser.message || '-'}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Skills</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.skills.map((skill, idx) => (
                      <span key={idx} className="border border-gray-300 text-gray-700 px-3 py-1 rounded-full text-sm">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Interests</p>
                  <div className="flex flex-wrap gap-2">
                    {selectedUser.interests.map((interest, idx) => (
                      <span key={idx} className="border border-indigo-300 text-indigo-700 px-3 py-1 rounded-full text-sm">
                        {interest}
                      </span>
                  ))}
                </div>
              </div>

              {currentUserProfile?.id !== selectedUser.id && (
                <div className="col-span-2 mt-6 pt-6 border-t">
                  <button
                    onClick={() => {
                      if (!confirm(`${selectedUser.name}（${selectedUser.email}）を退会者として削除しますか？\nこの操作は取り消せません。`)) return;
                      apiDeleteUser(selectedUser.id).then((res) => {
                        if (res.ok && res.success) {
                          setCurrentView('admin');
                          setSelectedUser(null);
                          apiUsers().then((r) => { if (r.ok && r.users) setAdminUsersList(r.users as UserProfile[]); });
                        } else {
                          alert(res.error || '削除に失敗しました');
                        }
                      });
                    }}
                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                  >
                    Delete User
                  </button>
                </div>
              )}
            </div>
          </div>
          </div>
        </div>
      )}
      <Footer />
      </div>
    </div>
  );
};

export default BusinessMatchingApp;