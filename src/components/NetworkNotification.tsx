import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Platform,
} from 'react-native';
import type { NotificationProps } from '../types';

/**
 * Network Notification Component
 * Works on both Web and React Native
 */
export function NetworkNotification({
  status,
  queuedCount = 0,
  onRetry,
  onDismiss,
  style,
  position = 'top',
  variant = 'banner',
}: NotificationProps) {
  const [visible, setVisible] = useState(true);
  const slideAnim = React.useRef(
    new Animated.Value(position === 'top' ? -100 : 100)
  ).current;

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: visible ? 0 : position === 'top' ? -100 : 100,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  }, [visible, position, slideAnim]);

  const handleDismiss = () => {
    setVisible(false);
    if (onDismiss) {
      setTimeout(onDismiss, 300);
    }
  };

  const getMessage = (): string => {
    if (!status.isOnline) {
      return queuedCount > 0
        ? `Offline — ${queuedCount} request${queuedCount > 1 ? 's' : ''} queued`
        : 'You are offline';
    }

    if (status.quality === 'weak') {
      return queuedCount > 0
        ? `Weak network — ${queuedCount} request${
            queuedCount > 1 ? 's' : ''
          } delayed`
        : 'Weak network connection';
    }

    if (queuedCount > 0) {
      return `Processing ${queuedCount} queued request${
        queuedCount > 1 ? 's' : ''
      }...`;
    }

    return 'Network connection restored';
  };

  const getBackgroundColor = (): string => {
    if (!status.isOnline) {
      return style?.backgroundColor || '#f44336';
    }
    if (status.quality === 'weak') {
      return style?.backgroundColor || '#ff9800';
    }
    return style?.backgroundColor || '#4caf50';
  };

  const containerStyle: any = {
    ...styles.container,
    backgroundColor: getBackgroundColor(),
    borderColor: style?.borderColor || 'transparent',
    borderRadius: style?.borderRadius ?? 8,
    padding: style?.padding ?? 12,
    ...(variant === 'toast' ? styles.toast : styles.banner),
  };

  const textStyle: any = {
    ...styles.text,
    color: style?.textColor || '#ffffff',
    fontSize: style?.fontSize ?? 14,
    fontFamily: style?.fontFamily,
  };

  if (!visible && !status.isOnline && queuedCount === 0) {
    return null;
  }

  const content = (
    <View style={containerStyle}>
      <Text style={textStyle}>{getMessage()}</Text>
      <View style={styles.actions}>
        {onRetry && status.isOnline && (
          <TouchableOpacity onPress={onRetry} style={styles.button}>
            <Text style={[textStyle, styles.buttonText]}>Retry</Text>
          </TouchableOpacity>
        )}
        {onDismiss && (
          <TouchableOpacity onPress={handleDismiss} style={styles.button}>
            <Text style={[textStyle, styles.buttonText]}>Dismiss</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  // Web-specific positioning
  if (Platform.OS === 'web') {
    return (
      <div
        style={{
          position: 'fixed',
          [position]: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 9999,
          width: '90%',
          maxWidth: 400,
        }}
      >
        {content}
      </div>
    );
  }

  // React Native positioning
  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          transform: [{ translateY: slideAnim }],
          [position]: 20,
        },
      ]}
    >
      {content}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  animatedContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
    zIndex: 9999,
    paddingHorizontal: 16,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  banner: {
    minHeight: 48,
  },
  toast: {
    minHeight: 40,
    borderRadius: 20,
  },
  text: {
    flex: 1,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    marginLeft: 12,
    gap: 8,
  },
  button: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  buttonText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
