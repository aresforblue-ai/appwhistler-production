// src/frontend/src/pages/ProfilePage.jsx
// User profile with customization (bio, avatar, social links, preferences)

import React, { useState, useRef, useEffect } from 'react';
import { useMutation, useQuery, gql } from '@apollo/client';
import notificationService from '../utils/NotificationService';
import { SkeletonProfile } from '../components/LoadingStates';

const GET_USER_PROFILE = gql`
  query GetUserProfile($userId: ID!) {
    user(id: $userId) {
      id
      username
      email
      bio
      avatar
      socialLinks {
        platform
        url
      }
      reputation
      createdAt
      preferences {
        notifications {
          email
          push
          inApp
        }
        privacy {
          profileVisibility
          showReputation
        }
        theme
      }
    }
  }
`;

const UPDATE_USER_PROFILE = gql`
  mutation UpdateUserProfile(
    $userId: ID!
    $bio: String
    $avatar: String
    $socialLinks: [SocialLinkInput!]
  ) {
    updateUserProfile(
      userId: $userId
      bio: $bio
      avatar: $avatar
      socialLinks: $socialLinks
    ) {
      id
      username
      bio
      avatar
      socialLinks {
        platform
        url
      }
    }
  }
`;

const UPDATE_USER_PREFERENCES = gql`
  mutation UpdateUserPreferences($userId: ID!, $preferences: PreferencesInput!) {
    updateUserPreferences(userId: $userId, preferences: $preferences) {
      id
      preferences {
        notifications {
          email
          push
          inApp
        }
        privacy {
          profileVisibility
          showReputation
        }
        theme
      }
    }
  }
`;

const ProfilePage = ({ userId }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    avatar: '',
    socialLinks: []
  });
  const [preferences, setPreferences] = useState({
    notifications: { email: true, push: true, inApp: true },
    privacy: { profileVisibility: 'public', showReputation: true },
    theme: 'dark'
  });
  const fileInputRef = useRef(null);

  const { data, loading, error } = useQuery(GET_USER_PROFILE, {
    variables: { userId }
  });

  const [updateProfile, { loading: updating }] = useMutation(UPDATE_USER_PROFILE);
  const [updatePreferences, { loading: updatingPrefs }] = useMutation(
    UPDATE_USER_PREFERENCES
  );

  useEffect(() => {
    if (data?.user) {
      const user = data.user;
      setFormData({
        bio: user.bio || '',
        avatar: user.avatar || '',
        socialLinks: user.socialLinks || []
      });
      setPreferences(user.preferences || preferences);
    }
  }, [data]);

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side compression
    const reader = new FileReader();
    reader.onload = (event) => {
      const canvas = document.createElement('canvas');
      const img = new Image();
      img.onload = () => {
        const size = 200;
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, size, size);
        const compressed = canvas.toDataURL('image/webp', 0.8);
        setFormData(prev => ({ ...prev, avatar: compressed }));
        notificationService.notify('Avatar updated', 'success', 3000);
      };
      img.src = event.target?.result;
    };
    reader.readAsDataURL(file);
  };

  const handleSocialLinkChange = (index, field, value) => {
    const newLinks = [...formData.socialLinks];
    newLinks[index] = { ...newLinks[index], [field]: value };
    setFormData(prev => ({ ...prev, socialLinks: newLinks }));
  };

  const addSocialLink = () => {
    setFormData(prev => ({
      ...prev,
      socialLinks: [...prev.socialLinks, { platform: 'twitter', url: '' }]
    }));
  };

  const removeSocialLink = (index) => {
    setFormData(prev => ({
      ...prev,
      socialLinks: prev.socialLinks.filter((_, i) => i !== index)
    }));
  };

  const handleSaveProfile = async () => {
    try {
      await updateProfile({
        variables: {
          userId,
          ...formData
        }
      });
      notificationService.notify('Profile updated successfully!', 'success', 4000);
      setIsEditing(false);
    } catch (err) {
      console.error('Profile update error:', err);
      notificationService.notify('Failed to update profile', 'error', 4000);
    }
  };

  const handleSavePreferences = async () => {
    try {
      await updatePreferences({
        variables: { userId, preferences }
      });
      notificationService.notify('Preferences saved!', 'success', 4000);
    } catch (err) {
      console.error('Preferences update error:', err);
      notificationService.notify('Failed to save preferences', 'error', 4000);
    }
  };

  if (loading) return <SkeletonProfile />;
  if (error) {
    return (
      <div className="p-6 bg-red-900/20 text-red-200 rounded-lg">
        Failed to load profile: {error.message}
      </div>
    );
  }

  const user = data?.user;
  if (!user) return <div className="p-6 text-center text-gray-400">User not found</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Profile Header */}
      <div className="bg-gradient-to-r from-purple-900/30 to-cyan-900/30 rounded-lg p-8 border border-purple-500/20">
        <div className="flex items-start justify-between gap-6">
          <div className="flex items-end gap-6">
            {/* Avatar */}
            <div className="relative">
              <img
                src={formData.avatar || '/default-avatar.png'}
                alt={user.username}
                className="w-32 h-32 rounded-full border-2 border-purple-500 object-cover"
              />
              {isEditing && (
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-purple-600 hover:bg-purple-700 text-white p-2 rounded-full"
                >
                  📷
                </button>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarUpload}
                className="hidden"
              />
            </div>

            {/* User Info */}
            <div>
              <h1 className="text-3xl font-bold text-white mb-2">{user.username}</h1>
              <p className="text-gray-400 mb-3">{user.email}</p>
              <div className="flex gap-4">
                <div>
                  <p className="text-sm text-gray-500">Reputation</p>
                  <p className="text-xl font-bold text-cyan-400">
                    {user.reputation || 0}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Member since</p>
                  <p className="text-cyan-400">
                    {new Date(user.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Edit Button */}
          <button
            onClick={() => setIsEditing(!isEditing)}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
          >
            {isEditing ? 'Cancel' : 'Edit Profile'}
          </button>
        </div>
      </div>

      {/* Bio Section */}
      <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">About</h2>
        {isEditing ? (
          <textarea
            value={formData.bio}
            onChange={(e) =>
              setFormData(prev => ({ ...prev, bio: e.target.value }))
            }
            placeholder="Tell us about yourself..."
            maxLength={500}
            className="w-full bg-gray-800 text-white rounded-lg p-3 border border-gray-700 focus:border-purple-500 outline-none resize-none h-32"
          />
        ) : (
          <p className="text-gray-300">{formData.bio || 'No bio yet'}</p>
        )}
      </div>

      {/* Social Links Section */}
      <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">Social Links</h2>
        <div className="space-y-3">
          {formData.socialLinks.map((link, idx) => (
            <div key={idx} className="flex gap-2">
              <select
                value={link.platform}
                onChange={(e) =>
                  handleSocialLinkChange(idx, 'platform', e.target.value)
                }
                disabled={!isEditing}
                className="flex-1 bg-gray-800 text-white rounded-lg p-2 border border-gray-700 focus:border-purple-500 outline-none disabled:opacity-50"
              >
                <option value="twitter">Twitter</option>
                <option value="github">GitHub</option>
                <option value="linkedin">LinkedIn</option>
                <option value="website">Website</option>
              </select>
              <input
                type="url"
                value={link.url}
                onChange={(e) =>
                  handleSocialLinkChange(idx, 'url', e.target.value)
                }
                placeholder="URL"
                disabled={!isEditing}
                className="flex-1 bg-gray-800 text-white rounded-lg p-2 border border-gray-700 focus:border-purple-500 outline-none disabled:opacity-50"
              />
              {isEditing && (
                <button
                  onClick={() => removeSocialLink(idx)}
                  className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
        {isEditing && (
          <button
            onClick={addSocialLink}
            className="mt-3 px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-lg"
          >
            + Add Link
          </button>
        )}
      </div>

      {/* Preferences Section */}
      <div className="bg-gray-900/50 rounded-lg p-6 border border-gray-800">
        <h2 className="text-xl font-bold text-white mb-4">Preferences</h2>

        {/* Notifications */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Notifications</h3>
          <div className="space-y-2">
            {['email', 'push', 'inApp'].map(key => (
              <label key={key} className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preferences.notifications[key]}
                  onChange={(e) =>
                    setPreferences(prev => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        [key]: e.target.checked
                      }
                    }))
                  }
                  className="w-4 h-4 rounded accent-purple-500"
                />
                <span className="text-gray-300 capitalize">
                  {key === 'inApp' ? 'In-App' : key} Notifications
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Privacy */}
        <div className="mb-6">
          <h3 className="text-sm font-semibold text-gray-300 mb-3">Privacy</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.privacy.profileVisibility === 'public'}
                onChange={(e) =>
                  setPreferences(prev => ({
                    ...prev,
                    privacy: {
                      ...prev.privacy,
                      profileVisibility: e.target.checked ? 'public' : 'private'
                    }
                  }))
                }
                className="w-4 h-4 rounded accent-purple-500"
              />
              <span className="text-gray-300">Public Profile</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={preferences.privacy.showReputation}
                onChange={(e) =>
                  setPreferences(prev => ({
                    ...prev,
                    privacy: {
                      ...prev.privacy,
                      showReputation: e.target.checked
                    }
                  }))
                }
                className="w-4 h-4 rounded accent-purple-500"
              />
              <span className="text-gray-300">Show Reputation</span>
            </label>
          </div>
        </div>

        {/* Save Preferences Button */}
        <button
          onClick={handleSavePreferences}
          disabled={updatingPrefs}
          className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:opacity-50 text-white rounded-lg transition-colors"
        >
          {updatingPrefs ? 'Saving...' : 'Save Preferences'}
        </button>
      </div>

      {/* Save Profile Button */}
      {isEditing && (
        <div className="flex gap-3">
          <button
            onClick={handleSaveProfile}
            disabled={updating}
            className="flex-1 px-4 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg font-semibold transition-colors"
          >
            {updating ? 'Saving...' : 'Save Profile'}
          </button>
          <button
            onClick={() => setIsEditing(false)}
            className="flex-1 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-white rounded-lg font-semibold"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
