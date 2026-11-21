import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  TextInputProps,
  ViewStyle,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../constants/colors';

interface Props extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  isPassword?: boolean;
  compact?: boolean;
  containerStyle?: ViewStyle;
}

export const Input = ({
  label,
  error,
  leftIcon,
  rightIcon,
  isPassword = false,
  compact = false,
  containerStyle,
  ...rest
}: Props) => {
  const [focused, setFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const hasError = !!error;

  return (
    <View style={[styles.container, containerStyle]}>
      {label && <Text style={styles.label}>{label}</Text>}

      <View
        style={[
          styles.inputRow,
          compact && styles.inputRowCompact,
          focused && styles.focused,
          hasError && styles.error,
        ]}
      >
        {leftIcon && <View style={styles.icon}>{leftIcon}</View>}

        <TextInput
          style={[styles.input, compact && styles.inputCompact]}
          placeholderTextColor={Colors.textTertiary}
          secureTextEntry={isPassword && !showPassword}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          {...rest}
        />

        {isPassword ? (
          <TouchableOpacity
            onPress={() => setShowPassword((v) => !v)}
            style={styles.icon}
          >
            <View style={styles.eyeIcon}>
              <Ionicons
                name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                size={20}
                color={Colors.textTertiary}
              />
            </View>
          </TouchableOpacity>
        ) : rightIcon ? (
          <View style={styles.icon}>{rightIcon}</View>
        ) : null}
      </View>

      {hasError && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  label: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textMuted,
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.border,
    borderRadius: 14,
    height: 52,
    paddingHorizontal: 14,
    gap: 10,
  },
  inputRowCompact: {
    height: 44,
    borderRadius: 12,
    paddingHorizontal: 12,
  },
  focused: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryLight,
  },
  error: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorLight,
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: Colors.textPrimary,
    height: '100%',
  },
  inputCompact: {
    fontSize: 13,
  },
  icon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeIcon: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 11,
    color: Colors.error,
    marginTop: 5,
    marginLeft: 4,
  },
});