import React, { useState, useEffect } from 'react';
import { StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Button as PaperButton } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import { userProfileService } from '../../services/user/UserProfileService';
import { useTheme } from '../../hooks/useTheme';

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
  const { colors } = useTheme();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [optimisticFollowing, setOptimisticFollowing] = useState(false);

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

      await refreshUserProfile();

      if (onFollowChange) {
        onFollowChange(newFollowingState);
      }

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
      setOptimisticFollowing(!newFollowingState);
      const errorMessage =
        error instanceof Error ? error.message : 'Failed to update following status';
      Alert.alert('Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return null;
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
          { 
            backgroundColor: optimisticFollowing ? 'transparent' : colors.text,
            borderColor: colors.text,
          }
        ]}
        labelStyle={[styles.compactLabel, { color: optimisticFollowing ? colors.text : colors.background }]}
        icon={({ size }) =>
          loading ? (
            <ActivityIndicator size={16} color={optimisticFollowing ? colors.text : colors.background} />
          ) : (
            <Ionicons name={buttonIcon} size={size} color={optimisticFollowing ? colors.text : colors.background} />
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
        { 
          backgroundColor: optimisticFollowing ? 'transparent' : colors.text,
          borderColor: colors.text,
        }
      ]}
      labelStyle={[styles.label, { color: optimisticFollowing ? colors.text : colors.background }]}
      icon={({ size }) =>
        loading ? (
          <ActivityIndicator size={20} color={optimisticFollowing ? colors.text : colors.background} />
        ) : (
          <Ionicons name={buttonIcon} size={size} color={optimisticFollowing ? colors.text : colors.background} />
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
    borderWidth: 1,
  },
  compactButton: {
    borderRadius: 6,
    paddingVertical: 0,
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
