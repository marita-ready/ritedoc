/**
 * RiteDoc Mobile App — Saved Notes Screen
 *
 * Displays all locally saved notes in a scrollable list, sorted by
 * most recent first. Supports:
 * - Search/filter through note text
 * - Pull-to-refresh
 * - Swipe left to reveal a Delete action on each card
 * - X button and long-press action menu for copy/share/delete
 * - "Delete All" bulk delete accessible from the header
 * - Empty state with a CTA to write the first note
 *
 * Tapping a note navigates to the RewriteResultScreen to view the
 * full before/after comparison.
 */

import React, {
  useState,
  useCallback,
  useEffect,
  useRef,
  useId,
} from 'react';
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
  Animated,
  PanResponder,
  Dimensions,
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  loadAllNotes,
  deleteNote,
  deleteAllNotes,
  type SavedNote,
} from '../services/noteStorage';
import { copyToClipboard, shareNote } from '../services/noteExport';

const BRAND_BLUE = '#2563EB';
const SWIPE_THRESHOLD = 80; // px to trigger delete reveal
const DELETE_BUTTON_WIDTH = 80;

interface Props {
  onGoBack: () => void;
  onWriteNote: () => void;
  onViewNote: (noteId: string, originalText: string, rewrittenText: string) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────

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

function getPreview(text: string, maxLength: number = 150): string {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trimEnd() + '...';
}

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

// ─── Swipeable note card ──────────────────────────────────────────────

interface SwipeableNoteCardProps {
  note: SavedNote;
  onView: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onShare: () => void;
  onLongPress: () => void;
}

function SwipeableNoteCard({
  note,
  onView,
  onDelete,
  onCopy,
  onShare,
  onLongPress,
}: SwipeableNoteCardProps) {
  const translateX = useRef(new Animated.Value(0)).current;
  const isOpen = useRef(false);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) => {
        // Only capture horizontal swipes with meaningful movement
        return (
          Math.abs(gestureState.dx) > 8 &&
          Math.abs(gestureState.dx) > Math.abs(gestureState.dy) * 1.5
        );
      },
      onPanResponderMove: (_, gestureState) => {
        // Only allow left swipe (negative dx), clamp to delete button width
        const newX = Math.max(
          -DELETE_BUTTON_WIDTH,
          Math.min(0, gestureState.dx + (isOpen.current ? -DELETE_BUTTON_WIDTH : 0))
        );
        translateX.setValue(newX);
      },
      onPanResponderRelease: (_, gestureState) => {
        const currentX = isOpen.current ? gestureState.dx - DELETE_BUTTON_WIDTH : gestureState.dx;

        if (currentX < -SWIPE_THRESHOLD / 2) {
          // Snap open
          Animated.spring(translateX, {
            toValue: -DELETE_BUTTON_WIDTH,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          isOpen.current = true;
        } else {
          // Snap closed
          Animated.spring(translateX, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
          isOpen.current = false;
        }
      },
    })
  ).current;

  const closeSwipe = () => {
    Animated.spring(translateX, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
    isOpen.current = false;
  };

  const handleDeletePress = () => {
    closeSwipe();
    onDelete();
  };

  const handleCardPress = () => {
    if (isOpen.current) {
      closeSwipe();
    } else {
      onView();
    }
  };

  return (
    <View style={styles.swipeContainer}>
      {/* Delete action behind the card */}
      <View style={styles.swipeDeleteAction}>
        <TouchableOpacity
          style={styles.swipeDeleteButton}
          onPress={handleDeletePress}
          activeOpacity={0.8}
        >
          <Text style={styles.swipeDeleteIcon}>🗑</Text>
          <Text style={styles.swipeDeleteText}>Delete</Text>
        </TouchableOpacity>
      </View>

      {/* The card itself */}
      <Animated.View
        style={[styles.noteCardAnimated, { transform: [{ translateX }] }]}
        {...panResponder.panHandlers}
      >
        <TouchableOpacity
          style={styles.noteCard}
          onPress={handleCardPress}
          onLongPress={onLongPress}
          activeOpacity={0.7}
          delayLongPress={400}
        >
          {/* Top row: date + action buttons */}
          <View style={styles.noteCardHeader}>
            <View style={styles.noteCardDateRow}>
              <Text style={styles.noteCardRelativeTime}>
                {getRelativeTime(note.createdAt)}
              </Text>
              <Text style={styles.noteCardDate}>
                {formatDate(note.createdAt)}
              </Text>
            </View>
            <View style={styles.noteCardActions}>
              <TouchableOpacity
                style={styles.noteCardActionButton}
                onPress={onCopy}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={styles.noteCardActionIcon}>📋</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.noteCardActionButton}
                onPress={onShare}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={styles.noteCardActionIcon}>↗</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.noteCardActionButton}
                onPress={onDelete}
                hitSlop={{ top: 8, bottom: 8, left: 4, right: 4 }}
              >
                <Text style={styles.noteCardDeleteIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Preview of rewritten note */}
          <Text style={styles.noteCardPreview} numberOfLines={3}>
            {getPreview(note.rewrittenText)}
          </Text>

          {/* Footer: word counts + swipe hint */}
          <View style={styles.noteCardFooter}>
            <View style={styles.noteCardWordBadge}>
              <Text style={styles.noteCardWordLabel}>Original</Text>
              <Text style={styles.noteCardWordValue}>
                {note.wordCountOriginal} words
              </Text>
            </View>
            <View style={styles.noteCardWordDivider} />
            <View style={styles.noteCardWordBadge}>
              <Text style={styles.noteCardWordLabel}>Rewritten</Text>
              <Text style={styles.noteCardWordValue}>
                {note.wordCountRewritten} words
              </Text>
            </View>
            <View style={styles.noteCardChevron}>
              <Text style={styles.noteCardChevronText}>›</Text>
            </View>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

// ─── Main screen ──────────────────────────────────────────────────────

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
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // ── Toast animation ─────────────────────────────────────────────────
  const toastOpacity = useRef(new Animated.Value(0)).current;
  const toastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback(
    (message: string) => {
      setToastMessage(message);
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
      Animated.timing(toastOpacity, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start();
      toastTimeoutRef.current = setTimeout(() => {
        Animated.timing(toastOpacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }).start(() => setToastMessage(null));
      }, 2000);
    },
    [toastOpacity]
  );

  useEffect(() => {
    return () => {
      if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    };
  }, []);

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
        `Delete the note from ${formatDate(note.createdAt)}? This cannot be undone.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              const success = await deleteNote(note.id);
              if (success) {
                setNotes((prev) => prev.filter((n) => n.id !== note.id));
                showToast('Note deleted');
              }
            },
          },
        ]
      );
    },
    [showToast]
  );

  const handleDeleteAll = useCallback(() => {
    if (notes.length === 0) return;

    Alert.alert(
      'Delete All Notes',
      `This will permanently delete all ${notes.length} saved ${notes.length === 1 ? 'note' : 'notes'} from this device. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: `Delete All ${notes.length}`,
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteAllNotes();
              setNotes([]);
              showToast('All notes deleted');
            } catch {
              Alert.alert('Error', 'Could not delete notes. Please try again.');
            }
          },
        },
      ]
    );
  }, [notes.length, showToast]);

  const handleViewNote = useCallback(
    (note: SavedNote) => {
      onViewNote(note.id, note.originalText, note.rewrittenText);
    },
    [onViewNote]
  );

  const handleQuickCopy = useCallback(
    async (note: SavedNote) => {
      const result = await copyToClipboard(
        { originalText: note.originalText, rewrittenText: note.rewrittenText },
        'rewritten'
      );
      if (result.success) showToast('Rewritten note copied!');
    },
    [showToast]
  );

  const handleQuickShare = useCallback(async (note: SavedNote) => {
    await shareNote(
      { originalText: note.originalText, rewrittenText: note.rewrittenText },
      'rewritten'
    );
  }, []);

  const handleLongPress = useCallback(
    (note: SavedNote) => {
      const texts = {
        originalText: note.originalText,
        rewrittenText: note.rewrittenText,
      };

      Alert.alert('Note Actions', formatDate(note.createdAt), [
        {
          text: 'Copy Rewritten Note',
          onPress: async () => {
            const result = await copyToClipboard(texts, 'rewritten');
            if (result.success) showToast('Rewritten note copied!');
          },
        },
        {
          text: 'Copy Original Note',
          onPress: async () => {
            const result = await copyToClipboard(texts, 'original');
            if (result.success) showToast('Original note copied!');
          },
        },
        {
          text: 'Copy Both Notes',
          onPress: async () => {
            const result = await copyToClipboard(texts, 'both');
            if (result.success) showToast('Both notes copied!');
          },
        },
        {
          text: 'Share Rewritten Note',
          onPress: () => shareNote(texts, 'rewritten'),
        },
        {
          text: 'Share Both Notes',
          onPress: () => shareNote(texts, 'both'),
        },
        {
          text: 'Delete Note',
          style: 'destructive',
          onPress: () => handleDelete(note),
        },
        { text: 'Cancel', style: 'cancel' },
      ]);
    },
    [showToast, handleDelete]
  );

  // ── Render: Toast ──────────────────────────────────────────────────
  const renderToast = () => {
    if (!toastMessage) return null;
    return (
      <Animated.View
        style={[styles.toastContainer, { opacity: toastOpacity }]}
        pointerEvents="none"
      >
        <View style={styles.toast}>
          <Text style={styles.toastText}>✓ {toastMessage}</Text>
        </View>
      </Animated.View>
    );
  };

  // ── Render: Empty state ─────────────────────────────────────────────
  const renderEmptyState = () => {
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
    <SwipeableNoteCard
      note={item}
      onView={() => handleViewNote(item)}
      onDelete={() => handleDelete(item)}
      onCopy={() => handleQuickCopy(item)}
      onShare={() => handleQuickShare(item)}
      onLongPress={() => handleLongPress(item)}
    />
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
        {notes.length > 0 ? (
          <TouchableOpacity
            onPress={handleDeleteAll}
            style={styles.deleteAllButton}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.deleteAllButtonText}>Delete All</Text>
          </TouchableOpacity>
        ) : (
          <View style={styles.headerSpacer} />
        )}
      </View>

      {/* Search bar (only show when there are notes) */}
      {!isLoading && notes.length > 0 && renderSearchBar()}

      {/* Note list or empty state */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading notes...</Text>
        </View>
      ) : notes.length === 0 ||
        (searchQuery.trim() && filteredNotes.length === 0) ? (
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
                Swipe left to delete · Long-press for more options
              </Text>
            </View>
          )}
        />
      )}

      {/* Floating toast */}
      {renderToast()}
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
  deleteAllButton: {
    paddingVertical: 4,
    paddingLeft: 8,
    minWidth: 60,
    alignItems: 'flex-end',
  },
  deleteAllButtonText: {
    fontSize: 14,
    color: '#EF4444',
    fontWeight: '600',
  },

  // ── Toast ──────────────────────────────────────────────────────────
  toastContainer: {
    position: 'absolute',
    top: 100,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 999,
  },
  toast: {
    backgroundColor: '#065F46',
    borderRadius: 10,
    paddingHorizontal: 20,
    paddingVertical: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  toastText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
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

  // ── Swipeable card container ───────────────────────────────────────
  swipeContainer: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 14,
  },
  swipeDeleteAction: {
    position: 'absolute',
    right: 0,
    top: 0,
    bottom: 0,
    width: DELETE_BUTTON_WIDTH,
    backgroundColor: '#EF4444',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteButton: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  swipeDeleteIcon: {
    fontSize: 18,
    marginBottom: 2,
  },
  swipeDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  noteCardAnimated: {
    backgroundColor: '#F8FAFC',
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
  noteCardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: 8,
    marginTop: -2,
  },
  noteCardActionButton: {
    padding: 4,
  },
  noteCardActionIcon: {
    fontSize: 15,
  },
  noteCardDeleteIcon: {
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
