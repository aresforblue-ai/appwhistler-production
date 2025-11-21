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
    <div className={`w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gradient-to-br ${gradients[app.name] || 'from-fog-400 to-fog-600'} flex items-center justify-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 active:scale-100 relative overflow-hidden group touch-manipulation`}>
      <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity"></div>
      <span className="relative text-2xl sm:text-3xl filter drop-shadow-lg">{iconMap[app.name] || app.icon || '📱'}</span>
    </div>
  );
}

export default AppIcon;
