import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { userProfileService } from '../../services/user/UserProfileService';

export type FollowItemType = 'team' | 'game';

export interface FollowButtonProps {
  itemId: string;
  itemType: FollowItemType;
  itemName?: string;
  onFollowChange?: (isFollowing: boolean) => void;
  compact?: boolean;
}

const FollowButton: React.FC<FollowButtonProps> = ({
  itemId,
  itemType,
  itemName,
  onFollowChange,
  compact = false,
}) => {
  const { user, userProfile, refreshUserProfile } = useAuth();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [optimisticFollowing, setOptimisticFollowing] = useState(false);

  // Determine if user is following this item
  useEffect(() => {
    if (!userProfile) {
      setIsFollowing(false);
      return;
    }

    const following =
      itemType === 'team'
        ? userProfile.followingTeams.includes(itemId)
        : userProfile.followingGames.includes(itemId);

    setIsFollowing(following);
    setOptimisticFollowing(following);
  }, [userProfile, itemId, itemType]);

  const handleFollowToggle = async () => {
    if (!user) {
      Alert.alert('Authentication Required', 'Please sign in to follow items');
      return;
    }

    // Optimistic UI update
    const newFollowingState = !optimisticFollowing;
    setOptimisticFollowing(newFollowingState);
    setLoading(true);

    try {
      if (itemType === 'team') {
        if (newFollowingState) {
          await userProfileService.followTeam(user.uid, itemId);
        } else {
          await userProfileService.unfollowTeam(user.uid, itemId);
        }
      } else {
        if (newFollowingState) {
          await userProfileService.followGame(user.uid, itemId);
        } else {
          await userProfileService.unfollowGame(user.uid, itemId);
        }
      }

      // Refresh user profile to get updated following lists
      await refreshUserProfile();

      // Notify parent component of change
      if (onFollowChange) {
        onFollowChange(newFollowingState);
      }

      // Show success message with additional info for teams
      const action = newFollowingState ? 'Following' : 'Unfollowed';
      const itemLabel = itemName || (itemType === 'team' ? 'team' : 'game');
      
      if (itemType === 'team' && newFollowingState) {
        Alert.alert(
          'Success', 
          `Following ${itemLabel}! You'll also automatically follow all their games.`
        );
      } else if (itemType === 'team' && !newFollowingState) {
        Alert.alert(
          'Success', 
          `Unfollowed ${itemLabel}. Their games have been unfollowed too.`
        );
      } else {
        Alert.alert('Success', `${action} ${itemLabel}`);
      }
    } catch (error) {
      console.error('Error toggling follow:', error);

      // Revert optimistic update on error
      setOptimisticFollowing(!newFollowingState);

      // Show error message
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update following status';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null; // Don't show button if user is not authenticated
  }

  const buttonLabel = optimisticFollowing ? 'Following' : 'Follow';
  const buttonIcon = optimisticFollowing ? 'checkmark-circle' : 'add-circle-outline';

  if (compact) {
    return (
      <PaperButton
        mode={optimisticFollowing ? 'outlined' : 'contained'}
        onPress={handleFollowToggle}
        disabled={loading}
        style={[
          styles.compactButton,
          optimisticFollowing ? styles.followingButton : styles.followButton,
        ]}
        labelStyle={styles.compactLabel}
        icon={({ size, color }) =>
          loading ? (
            <ActivityIndicator size={16} color={color} />
          ) : (
            <Ionicons name={buttonIcon} size={size} color={color} />
          )
        }
      >
        {buttonLabel}
      </PaperButton>
    );
  }

  return (
    <PaperButton
      mode={optimisticFollowing ? 'outlined' : 'contained'}
      onPress={handleFollowToggle}
      disabled={loading}
      style={[
        styles.button,
        optimisticFollowing ? styles.followingButton : styles.followButton,
      ]}
      labelStyle={styles.label}
      icon={({ size, color }) =>
        loading ? (
          <ActivityIndicator size={20} color={color} />
        ) : (
          <Ionicons name={buttonIcon} size={size} color={color} />
        )
      }
    >
      {buttonLabel}
    </PaperButton>
  );
};

const styles = StyleSheet.create({
  button: {
    borderRadius: 8,
  },
  compactButton: {
    borderRadius: 6,
    paddingVertical: 0,
  },
  followButton: {
    backgroundColor: '#6200ee',
  },
  followingButton: {
    borderColor: '#6200ee',
    borderWidth: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  compactLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
});

export default FollowButton;
