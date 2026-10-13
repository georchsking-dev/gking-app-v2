import * as React from 'react';

import { AppChat } from '../src/apps/chat/AppChat';
import { GeminiUI } from '../src/apps/gemini-ui/GeminiUI';
import { withNextJSPerPageLayout } from '~/common/layout/withLayout';

export default function IndexPage() {
  const [viewMode, setViewMode] = React.useState<'gemini' | 'classic'>('gemini');

  if (viewMode === 'classic') {
    return (
      <div className="relative">
        <button
          onClick={() => setViewMode('gemini')}
          className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-full bg-blue-600 text-white text-xs font-semibold shadow-2xl hover:bg-blue-500 transition"
        >
          ✨ Volver a Interfaz Gemini
        </button>
        <AppChat />
      </div>
    );
  }

  return <GeminiUI onSwitchToClassic={() => setViewMode('classic')} />;
}
