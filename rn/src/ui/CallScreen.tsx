import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { AgentState } from 'agora-agent-client-toolkit';
import type { Turn } from '../CallState';

interface Props {
  agentState: AgentState;
  micMuted: boolean;
  turns: Turn[];
  onToggleMic: () => void;
  onEnd: () => void;
}

export function CallScreen({ agentState, micMuted, turns, onToggleMic, onEnd }: Props) {
  return (
    <View style={styles.container}>
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{agentState}</Text>
      </View>

      <FlatList
        style={styles.list}
        data={turns}
        keyExtractor={(t) => `${t.turnId}-${t.type}`}
        renderItem={({ item }) => (
          <View
            style={[
              styles.bubble,
              item.type === 'agent' ? styles.agentBubble : styles.userBubble,
            ]}>
            <Text style={styles.role}>{item.type === 'agent' ? 'Agent' : 'You'}</Text>
            <Text style={styles.text}>{item.text}</Text>
          </View>
        )}
        ListEmptyComponent={
          <Text style={styles.empty}>Waiting for the agent…</Text>
        }
      />

      <View style={styles.controls}>
        <TouchableOpacity
          style={[styles.control, micMuted && styles.controlActive]}
          onPress={onToggleMic}>
          <Text style={styles.controlText}>{micMuted ? 'Unmute' : 'Mute'}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.control, styles.endControl]} onPress={onEnd}>
          <Text style={[styles.controlText, styles.endText]}>End</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  badge: {
    alignSelf: 'center',
    backgroundColor: '#eef2fb',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 12,
  },
  badgeText: { color: '#2d6cdf', fontWeight: '600', textTransform: 'capitalize' },
  list: { flex: 1 },
  bubble: { padding: 12, borderRadius: 12, marginVertical: 4, maxWidth: '85%' },
  agentBubble: { backgroundColor: '#eef2fb', alignSelf: 'flex-start' },
  userBubble: { backgroundColor: '#dcf8e6', alignSelf: 'flex-end' },
  role: { fontSize: 11, color: '#888', marginBottom: 2 },
  text: { fontSize: 16, color: '#222' },
  empty: { textAlign: 'center', color: '#999', marginTop: 32 },
  controls: { flexDirection: 'row', justifyContent: 'space-around', paddingTop: 12 },
  control: {
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 24,
    backgroundColor: '#e8e8e8',
  },
  controlActive: { backgroundColor: '#f5d442' },
  endControl: { backgroundColor: '#c0392b' },
  controlText: { fontSize: 16, fontWeight: '600', color: '#222' },
  endText: { color: '#fff' },
});
