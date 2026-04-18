/**
 * RiteDoc Mobile App — Saved Notes Screen
 *
 * Displays all locally saved notes in a scrollable list, sorted by
 * most recent first. Supports search/filter, pull-to-refresh,
 * swipe-to-delete, and an empty state with a CTA to write the first note.
 *
 * Tapping a note navigates to the RewriteResultScreen to view the
 * full before/after comparison.
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  Alert,
  Platform,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  loadAllNotes,
  deleteNote,
  searchNotes,
  type SavedNote,
} from '../services/noteStorage';

const BRAND_BLUE = '#2563EB';

interface Props {
  onGoBack: () => void;
  onWriteNote: () => void;
  onViewNote: (originalText: string, rewrittenText: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────

/** Format ISO date to a human-readable string */
function formatDate(isoString: string): string {
  const date = new Date(isoString);
  return date.toLocaleDateString('en-AU', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** Get a preview of text, truncated to maxLength chars */
function getPreview(text: string, maxLength: number = 100): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trimEnd() + '...';
}

/** Format relative time (e.g. "2 hours ago", "Yesterday") */
function getRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(isoString);
}

export default function SavedNotesScreen({
  onGoBack,
  onWriteNote,
  onViewNote,
}: Props) {
  const [notes, setNotes] = useState<SavedNote[]>([]);
  const [filteredNotes, setFilteredNotes] = useState<SavedNote[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // ── Load notes on mount ─────────────────────────────────────────────
  useEffect(() => {
    loadNotes();
  }, []);

  // ── Filter when search query changes ────────────────────────────────
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredNotes(notes);
    } else {
      const lowerQuery = searchQuery.toLowerCase();
      setFilteredNotes(
        notes.filter(
          (note) =>
            note.originalText.toLowerCase().includes(lowerQuery) ||
            note.rewrittenText.toLowerCase().includes(lowerQuery)
        )
      );
    }
  }, [searchQuery, notes]);

  const loadNotes = useCallback(async () => {
    try {
      const allNotes = await loadAllNotes();
      setNotes(allNotes);
    } catch (error) {
      console.warn('[SavedNotesScreen] Failed to load notes:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadNotes();
    setIsRefreshing(false);
  }, [loadNotes]);

  const handleDelete = useCallback(
    (note: SavedNote) => {
      Alert.alert(
        'Delete Note',
        `Are you sure you want to delete this note from ${formatDate(note.createdAt)}? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const success = await deleteNote(note.id);
              if (success) {
                setNotes((prev) => prev.filter((n) => n.id !== note.id));
              }
            },
          },
        ]
      );
    },
    []
  );

  const handleViewNote = useCallback(
    (note: SavedNote) => {
      onViewNote(note.originalText, note.rewrittenText);
    },
    [onViewNote]
  );

  // ── Render: Empty state ─────────────────────────────────────────────
  const renderEmptyState = () => {
    // If searching and no results
    if (searchQuery.trim()) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Text style={styles.emptyIcon}>🔍</Text>
          </View>
          <Text style={styles.emptyTitle}>No Matching Notes</Text>
          <Text style={styles.emptySubtitle}>
            No notes match "{searchQuery}".{'\n'}
            Try a different search term.
          </Text>
          <TouchableOpacity
            style={styles.emptyClearButton}
            onPress={() => setSearchQuery('')}
            activeOpacity={0.7}
          >
            <Text style={styles.emptyClearButtonText}>Clear Search</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // No notes at all
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconContainer}>
          <Text style={styles.emptyIcon}>📋</Text>
        </View>
        <Text style={styles.emptyTitle}>No Saved Notes Yet</Text>
        <Text style={styles.emptySubtitle}>
          Your rewritten notes will appear here.{'\n'}
          Notes are stored securely on this device.
        </Text>
        <TouchableOpacity
          style={styles.emptyActionButton}
          onPress={onWriteNote}
          activeOpacity={0.85}
        >
          <Text style={styles.emptyActionButtonText}>
            ✏️ Write Your First Note
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  // ── Render: Note list item ──────────────────────────────────────────
  const renderNoteItem = ({ item }: { item: SavedNote }) => (
    <TouchableOpacity
      style={styles.noteCard}
      onPress={() => handleViewNote(item)}
      onLongPress={() => handleDelete(item)}
      activeOpacity={0.7}
    >
      {/* Top row: date + word count */}
      <View style={styles.noteCardHeader}>
        <View style={styles.noteCardDateRow}>
          <Text style={styles.noteCardRelativeTime}>
            {getRelativeTime(item.createdAt)}
          </Text>
          <Text style={styles.noteCardDate}>
            {formatDate(item.createdAt)}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.noteCardDeleteButton}
          onPress={() => handleDelete(item)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.noteCardDeleteText}>✕</Text>
        </TouchableOpacity>
      </View>

      {/* Preview of rewritten note */}
      <Text style={styles.noteCardPreview} numberOfLines={3}>
        {getPreview(item.rewrittenText, 150)}
      </Text>

      {/* Footer: word counts */}
      <View style={styles.noteCardFooter}>
        <View style={styles.noteCardWordBadge}>
          <Text style={styles.noteCardWordLabel}>Original</Text>
          <Text style={styles.noteCardWordValue}>
            {item.wordCountOriginal} words
          </Text>
        </View>
        <View style={styles.noteCardWordDivider} />
        <View style={styles.noteCardWordBadge}>
          <Text style={styles.noteCardWordLabel}>Rewritten</Text>
          <Text style={styles.noteCardWordValue}>
            {item.wordCountRewritten} words
          </Text>
        </View>
        <View style={styles.noteCardChevron}>
          <Text style={styles.noteCardChevronText}>›</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // ── Render: Search bar ──────────────────────────────────────────────
  const renderSearchBar = () => (
    <View style={styles.searchContainer}>
      <View style={styles.searchInputWrapper}>
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search notes..."
          placeholderTextColor="#9CA3AF"
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
        {searchQuery.length > 0 && Platform.OS === 'android' && (
          <TouchableOpacity
            onPress={() => setSearchQuery('')}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.searchClear}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      {notes.length > 0 && (
        <Text style={styles.noteCountText}>
          {filteredNotes.length === notes.length
            ? `${notes.length} ${notes.length === 1 ? 'note' : 'notes'}`
            : `${filteredNotes.length} of ${notes.length}`}
        </Text>
      )}
    </View>
  );

  // ── Main render ────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <StatusBar style="dark" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={onGoBack}
          style={styles.backButton}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.backButtonText}>← Back</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Saved Notes</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Search bar (only show when there are notes) */}
      {!isLoading && notes.length > 0 && renderSearchBar()}

      {/* Note list or empty state */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      ) : notes.length === 0 || (searchQuery.trim() && filteredNotes.length === 0) ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredNotes}
          keyExtractor={(item) => item.id}
          renderItem={renderNoteItem}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefreshing}
              onRefresh={handleRefresh}
              tintColor={BRAND_BLUE}
              colors={[BRAND_BLUE]}
            />
          }
          ItemSeparatorComponent={() => <View style={styles.listSeparator} />}
          ListFooterComponent={() => (
            <View style={styles.listFooter}>
              <Text style={styles.listFooterText}>
                Long-press a note to delete it
              </Text>
            </View>
          )}
        />
      )}
    </SafeAreaView>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },

  // ── Header ─────────────────────────────────────────────────────────
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    paddingVertical: 4,
    paddingRight: 8,
    minWidth: 60,
  },
  backButtonText: {
    fontSize: 16,
    color: BRAND_BLUE,
    fontWeight: '600',
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#111827',
  },
  headerSpacer: {
    minWidth: 60,
  },

  // ── Search bar ─────────────────────────────────────────────────────
  searchContainer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
    backgroundColor: '#F8FAFC',
  },
  searchInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 4,
  },
  searchIcon: {
    fontSize: 14,
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#111827',
    paddingVertical: 0,
  },
  searchClear: {
    fontSize: 14,
    color: '#9CA3AF',
    paddingLeft: 8,
  },
  noteCountText: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
    marginTop: 8,
    paddingHorizontal: 4,
  },

  // ── Loading ────────────────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 15,
    color: '#6B7280',
  },

  // ── Empty state ────────────────────────────────────────────────────
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 20,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyIcon: {
    fontSize: 36,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111827',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#6B7280',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 24,
  },
  emptyActionButton: {
    backgroundColor: BRAND_BLUE,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 28,
    shadowColor: BRAND_BLUE,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  emptyActionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  emptyClearButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  emptyClearButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: BRAND_BLUE,
  },

  // ── List ───────────────────────────────────────────────────────────
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 24,
  },
  listSeparator: {
    height: 10,
  },
  listFooter: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  listFooterText: {
    fontSize: 12,
    color: '#9CA3AF',
  },

  // ── Note card ──────────────────────────────────────────────────────
  noteCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  noteCardHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  noteCardDateRow: {
    flex: 1,
  },
  noteCardRelativeTime: {
    fontSize: 14,
    fontWeight: '700',
    color: '#374151',
    marginBottom: 2,
  },
  noteCardDate: {
    fontSize: 12,
    color: '#9CA3AF',
    fontWeight: '500',
  },
  noteCardDeleteButton: {
    padding: 4,
    marginLeft: 8,
    marginTop: -2,
  },
  noteCardDeleteText: {
    fontSize: 16,
    color: '#D1D5DB',
    fontWeight: '600',
  },
  noteCardPreview: {
    fontSize: 15,
    color: '#374151',
    lineHeight: 22,
    marginBottom: 12,
  },
  noteCardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
  },
  noteCardWordBadge: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  noteCardWordLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: '#9CA3AF',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
    marginRight: 4,
  },
  noteCardWordValue: {
    fontSize: 12,
    fontWeight: '700',
    color: '#6B7280',
  },
  noteCardWordDivider: {
    width: 1,
    height: 14,
    backgroundColor: '#E5E7EB',
    marginHorizontal: 12,
  },
  noteCardChevron: {
    flex: 1,
    alignItems: 'flex-end',
  },
  noteCardChevronText: {
    fontSize: 22,
    color: '#D1D5DB',
    fontWeight: '300',
  },
});
