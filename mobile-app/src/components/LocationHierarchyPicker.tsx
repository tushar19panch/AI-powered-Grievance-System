import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { locationApi, LocationItem } from '../services/locationService';
import { COLORS, RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../theme';

interface LocationHierarchyPickerProps {
  isHindi?: boolean;
  selectedState?: string;
  selectedDistrict?: string;
  selectedBlock?: string;
  selectedVillage?: string;
  selectedWard?: string;
  onDistrictChange: (district: string) => void;
  onBlockChange?: (block: string) => void;
  onVillageChange?: (village: string) => void;
  onWardChange?: (ward: string) => void;
  showBlock?: boolean;
  showVillage?: boolean;
  showWard?: boolean;
  districtLabel?: string;
  blockLabel?: string;
}

export function LocationHierarchyPicker({
  isHindi = true,
  selectedState = 'Madhya Pradesh',
  selectedDistrict = '',
  selectedBlock = '',
  selectedVillage = '',
  selectedWard = '',
  onDistrictChange,
  onBlockChange = () => {},
  onVillageChange = () => {},
  onWardChange = () => {},
  showBlock = true,
  showVillage = true,
  showWard = true,
  districtLabel,
  blockLabel,
}: LocationHierarchyPickerProps) {
  // Modal state
  const [modalType, setModalType] = useState<'district' | 'block' | 'village' | 'ward' | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);

  // Lists
  const [districts, setDistricts] = useState<LocationItem[]>([]);
  const [blocks, setBlocks] = useState<LocationItem[]>([]);
  const [villages, setVillages] = useState<LocationItem[]>([]);
  const [wards, setWards] = useState<LocationItem[]>([]);

  // Load districts on mount
  useEffect(() => {
    loadDistricts();
  }, []);

  // When selectedDistrict changes, load its blocks and reset subsequent
  useEffect(() => {
    if (selectedDistrict) {
      loadBlocks(selectedDistrict);
    } else {
      setBlocks([]);
      setVillages([]);
      setWards([]);
    }
  }, [selectedDistrict]);

  // When selectedBlock changes, load its villages
  useEffect(() => {
    if (selectedBlock) {
      loadVillages(selectedBlock);
    } else {
      setVillages([]);
      setWards([]);
    }
  }, [selectedBlock]);

  // When selectedVillage changes, load its wards
  useEffect(() => {
    if (selectedVillage) {
      loadWards(selectedVillage);
    } else {
      setWards([]);
    }
  }, [selectedVillage]);

  const loadDistricts = async () => {
    setLoading(true);
    try {
      const data = await locationApi.getDistricts('MP');
      setDistricts(data);
    } finally {
      setLoading(false);
    }
  };

  const loadBlocks = async (districtId: string) => {
    setLoading(true);
    try {
      const data = await locationApi.getBlocks(districtId);
      setBlocks(data);
    } finally {
      setLoading(false);
    }
  };

  const loadVillages = async (blockId: string) => {
    setLoading(true);
    try {
      const data = await locationApi.getVillages(blockId);
      setVillages(data);
    } finally {
      setLoading(false);
    }
  };

  const loadWards = async (villageId: string) => {
    setLoading(true);
    try {
      const data = await locationApi.getWards(villageId);
      setWards(data);
    } finally {
      setLoading(false);
    }
  };

  const openPicker = (type: 'district' | 'block' | 'village' | 'ward') => {
    if (type === 'block' && !selectedDistrict) return;
    if (type === 'village' && !selectedBlock) return;
    if (type === 'ward' && !selectedVillage) return;

    setSearchQuery('');
    setModalType(type);
  };

  const handleSelect = (item: LocationItem) => {
    if (modalType === 'district') {
      if (item.name !== selectedDistrict) {
        onDistrictChange(item.name);
        onBlockChange('');
        onVillageChange('');
        onWardChange('');
      }
    } else if (modalType === 'block') {
      if (item.name !== selectedBlock) {
        onBlockChange(item.name);
        onVillageChange('');
        onWardChange('');
      }
    } else if (modalType === 'village') {
      if (item.name !== selectedVillage) {
        onVillageChange(item.name);
        onWardChange('');
      }
    } else if (modalType === 'ward') {
      onWardChange(item.id);
    }
    setModalType(null);
  };

  const getActiveList = (): LocationItem[] => {
    let list: LocationItem[] = [];
    if (modalType === 'district') list = districts;
    else if (modalType === 'block') list = blocks;
    else if (modalType === 'village') list = villages;
    else if (modalType === 'ward') list = wards;

    if (!searchQuery.trim()) return list;
    const q = searchQuery.toLowerCase().trim();
    return list.filter((i) => i.name.toLowerCase().includes(q) || i.id.toLowerCase().includes(q));
  };

  const getModalTitle = (): string => {
    if (modalType === 'district') return isHindi ? 'जिला चुनें' : 'Select District';
    if (modalType === 'block') return isHindi ? 'विकासखंड / ब्लॉक चुनें' : 'Select Block';
    if (modalType === 'village') return isHindi ? 'गाँव चुनें' : 'Select Village';
    if (modalType === 'ward') return isHindi ? 'वार्ड चुनें' : 'Select Ward';
    return '';
  };

  return (
    <View style={styles.container}>
      {/* 1. STATE (READ-ONLY WITH CHECKMARK) */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{isHindi ? 'राज्य' : 'State'}</Text>
        <View style={[styles.inputBox, styles.disabledBox]}>
          <View style={styles.inputIconBox}>
            <Ionicons name="map-outline" size={20} color={COLORS.navy} />
          </View>
          <Text style={styles.fixedValueText}>{isHindi && (selectedState === 'Madhya Pradesh' || selectedState.toLowerCase().includes('madhya pradesh')) ? 'मध्य प्रदेश' : selectedState}</Text>
          <View style={styles.fixedCheckmark}>
            <Ionicons name="checkmark-circle" size={20} color={COLORS.success} />
          </View>
        </View>
      </View>

      {/* 2. DISTRICT */}
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>{districtLabel || (isHindi ? 'जिला' : 'District')}</Text>
        <TouchableOpacity
          style={styles.inputBox}
          onPress={() => openPicker('district')}
          activeOpacity={0.8}
        >
          <View style={styles.inputIconBox}>
            <Ionicons name="business-outline" size={20} color={COLORS.navy} />
          </View>
          <Text
            style={[
              styles.dropdownValueText,
              !selectedDistrict && styles.placeholderText,
            ]}
            numberOfLines={1}
          >
            {selectedDistrict || (isHindi ? 'जिला चुनें' : 'Select District')}
          </Text>
          <Ionicons name="chevron-down" size={18} color={COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* 3. BLOCK / VIKAS KHAND / TEHSIL */}
      {showBlock && (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{blockLabel || (isHindi ? 'विकासखंड / ब्लॉक' : 'Block / Taluka')}</Text>
          <TouchableOpacity
            style={[styles.inputBox, !selectedDistrict && styles.disabledBox]}
            onPress={() => openPicker('block')}
            activeOpacity={0.8}
            disabled={!selectedDistrict}
          >
            <View style={styles.inputIconBox}>
              <Ionicons
                name="git-network-outline"
                size={20}
                color={!selectedDistrict ? COLORS.textMuted : COLORS.navy}
              />
            </View>
            <Text
              style={[
                styles.dropdownValueText,
                !selectedBlock && styles.placeholderText,
              ]}
              numberOfLines={1}
            >
              {selectedBlock ||
                (selectedDistrict
                  ? isHindi
                    ? 'विकासखंड चुनें'
                    : 'Select Block'
                  : isHindi
                  ? 'पहले जिला चुनें'
                  : 'Select District first')}
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={!selectedDistrict ? '#CBD5E1' : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* 4. VILLAGE */}
      {showVillage && (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{isHindi ? 'गाँव' : 'Village'}</Text>
          <TouchableOpacity
            style={[styles.inputBox, !selectedBlock && styles.disabledBox]}
            onPress={() => openPicker('village')}
            activeOpacity={0.8}
            disabled={!selectedBlock}
          >
            <View style={styles.inputIconBox}>
              <Ionicons
                name="home-outline"
                size={20}
                color={!selectedBlock ? COLORS.textMuted : COLORS.navy}
              />
            </View>
            <Text
              style={[
                styles.dropdownValueText,
                !selectedVillage && styles.placeholderText,
              ]}
              numberOfLines={1}
            >
              {selectedVillage ||
                (selectedBlock
                  ? isHindi
                    ? 'अपना गाँव चुनें'
                    : 'Select Village'
                  : isHindi
                  ? 'पहले ब्लॉक चुनें'
                  : 'Select Block first')}
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={!selectedBlock ? '#CBD5E1' : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* 5. WARD */}
      {showWard && (
        <View style={styles.fieldGroup}>
          <Text style={styles.label}>{isHindi ? 'वार्ड' : 'Ward'}</Text>
          <TouchableOpacity
            style={[styles.inputBox, !selectedVillage && styles.disabledBox]}
            onPress={() => openPicker('ward')}
            activeOpacity={0.8}
            disabled={!selectedVillage}
          >
            <View style={styles.inputIconBox}>
              <Ionicons
                name="grid-outline"
                size={20}
                color={!selectedVillage ? COLORS.textMuted : COLORS.navy}
              />
            </View>
            <Text
              style={[
                styles.dropdownValueText,
                !selectedWard && styles.placeholderText,
              ]}
              numberOfLines={1}
            >
              {selectedWard
                ? `${isHindi ? 'वार्ड' : 'Ward'} ${selectedWard}`
                : selectedVillage
                ? isHindi
                  ? 'अपना वार्ड चुनें'
                  : 'Select Ward'
                : isHindi
                ? 'पहले गाँव चुनें'
                : 'Select Village first'}
            </Text>
            <Ionicons
              name="chevron-down"
              size={18}
              color={!selectedVillage ? '#CBD5E1' : COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* SEARCHABLE SELECTION MODAL */}
      <Modal
        visible={modalType !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setModalType(null)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            {/* MODAL HEADER */}
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{getModalTitle()}</Text>
              <TouchableOpacity
                onPress={() => setModalType(null)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <Ionicons name="close" size={24} color={COLORS.textMuted} />
              </TouchableOpacity>
            </View>

            {/* SEARCH BAR (ESPECIALLY USEFUL FOR VILLAGES & DISTRICTS) */}
            <View style={styles.searchContainer}>
              <Ionicons name="search-outline" size={18} color={COLORS.textMuted} />
              <TextInput
                style={styles.searchInput}
                placeholder={isHindi ? 'खोजें (Search)...' : 'Type to search...'}
                placeholderTextColor={COLORS.textMuted}
                value={searchQuery}
                onChangeText={setSearchQuery}
                autoCorrect={false}
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => setSearchQuery('')}>
                  <Ionicons name="close-circle" size={16} color={COLORS.textMuted} />
                </TouchableOpacity>
              ) : null}
            </View>

            {/* LIST OF OPTIONS */}
            {loading ? (
              <View style={styles.loaderBox}>
                <ActivityIndicator size="small" color={COLORS.primary} />
                <Text style={styles.loadingText}>
                  {isHindi ? 'लोड हो रहा है...' : 'Loading options...'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={getActiveList()}
                keyExtractor={(item) => item.id}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.listContent}
                renderItem={({ item }) => {
                  const isSelected =
                    (modalType === 'district' && selectedDistrict === item.name) ||
                    (modalType === 'block' && selectedBlock === item.name) ||
                    (modalType === 'village' && selectedVillage === item.name) ||
                    (modalType === 'ward' && selectedWard === item.id);

                  return (
                    <TouchableOpacity
                      style={[styles.listItem, isSelected && styles.listItemSelected]}
                      onPress={() => handleSelect(item)}
                      activeOpacity={0.75}
                    >
                      <Text
                        style={[
                          styles.listItemText,
                          isSelected && styles.listItemTextSelected,
                        ]}
                      >
                        {item.name}
                      </Text>
                      {isSelected && (
                        <Ionicons
                          name="checkmark-circle"
                          size={19}
                          color={COLORS.primary}
                        />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={styles.emptyBox}>
                    <Ionicons name="alert-circle-outline" size={32} color={COLORS.textMuted} />
                    <Text style={styles.emptyText}>
                      {isHindi ? 'कोई परिणाम नहीं मिला।' : 'No results found.'}
                    </Text>
                  </View>
                }
              />
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 4,
  },
  fieldGroup: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.navy,
    marginBottom: 6,
  },
  inputBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  disabledBox: {
    backgroundColor: '#F8FAFC',
    borderColor: '#E2E8F0',
  },
  inputIconBox: {
    width: 28,
    alignItems: 'center',
    marginRight: 8,
  },
  fixedValueText: {
    flex: 1,
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.navy,
  },
  fixedCheckmark: {
    paddingRight: 2,
  },
  dropdownValueText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.navy,
  },
  placeholderText: {
    color: COLORS.textMuted,
    fontWeight: '400',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '75%',
    minHeight: '40%',
    padding: 18,
    ...SHADOWS.large,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: COLORS.navy,
  },
  closeButton: {
    padding: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: COLORS.navy,
    padding: 0,
  },
  listContent: {
    paddingBottom: 20,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 13,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F8FAFC',
    borderRadius: 8,
  },
  listItemSelected: {
    backgroundColor: COLORS.primaryLight,
  },
  listItemText: {
    fontSize: 14,
    color: '#334155',
    fontWeight: '600',
  },
  listItemTextSelected: {
    color: COLORS.primary,
    fontWeight: '800',
  },
  loaderBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
  },
  emptyBox: {
    paddingVertical: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 13,
    color: COLORS.textMuted,
    marginTop: 8,
  },
});
