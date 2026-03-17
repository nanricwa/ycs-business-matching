import React from 'react';

/** プライバシーポリシー・利用規約へのリンクを表示するフッター */
const TERMS_URL = 'https://drive.google.com/file/d/15eoJorM8WkiktBv-Q3EACf0pQrYN8DS3/view';
const PRIVACY_URL = 'https://drive.google.com/file/d/1IiJv7gHjXRWeU8FZa_QutxtacsVDYT5n/view';

export const Footer: React.FC = () => (
  <footer className="mt-auto py-4 text-center text-sm text-gray-500 border-t border-gray-200 bg-white/50">
    <a
      href={PRIVACY_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="text-purple-600 hover:text-purple-800 hover:underline"
    >
      プライバシーポリシー
    </a>
    <span className="mx-2">|</span>
    <a
      href={TERMS_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="text-purple-600 hover:text-purple-800 hover:underline"
    >
      利用規約
    </a>
  </footer>
);

export default Footer;
