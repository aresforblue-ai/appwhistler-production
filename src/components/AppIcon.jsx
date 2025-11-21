// Beautiful app icon with recognizable brand icons
function AppIcon({ app }) {
  const iconMap = {
    'Facebook': '📘',
    'Google': '🔍',
    'Twitter': '🐦',
    'LinkedIn': '💼',
    'WhatsApp': '💬',
    'Instagram': '📷'
  };
  const gradients = {
    'Facebook': 'from-blue-600 to-blue-700',
    'Google': 'from-red-500 via-yellow-500 to-green-500',
    'Twitter': 'from-sky-400 to-blue-500',
    'LinkedIn': 'from-blue-700 to-blue-800',
    'WhatsApp': 'from-green-500 to-emerald-600',
    'Instagram': 'from-purple-500 via-pink-500 to-orange-500'
  };
  return (
    <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${gradients[app.name] || 'from-slate-400 to-slate-600'} flex items-center justify-center shadow-xl hover:shadow-2xl transition-all duration-300 hover:scale-110 hover:rotate-3 relative overflow-hidden group`}>
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <span className="relative text-3xl filter drop-shadow-lg">{iconMap[app.name] || app.icon || '📱'}</span>
    </div>
  );
}

export default AppIcon;
