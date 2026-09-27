import { getApiBaseUrl } from './api';

export interface LocationItem {
  id: string;
  name: string;
  parentId?: string;
}

// Fallback MP Location Data (Used if backend is offline/unreachable)
const FALLBACK_DISTRICTS: LocationItem[] = [
  { id: 'SEHORE', name: 'सीहोर / Sehore' },
  { id: 'BHOPAL', name: 'भोपाल / Bhopal' },
  { id: 'INDORE', name: 'इंदौर / Indore' },
  { id: 'UJJAIN', name: 'उज्जैन / Ujjain' },
  { id: 'JABALPUR', name: 'जबलपुर / Jabalpur' },
  { id: 'GWALIOR', name: 'ग्वालियर / Gwalior' },
  { id: 'DEWAS', name: 'देवास / Dewas' },
  { id: 'DHAR', name: 'धार / Dhar' },
  { id: 'SAGAR', name: 'सागर / Sagar' },
  { id: 'REWA', name: 'रीवा / Rewa' },
  { id: 'SATNA', name: 'सतना / Satna' },
  { id: 'KHARGONE', name: 'खरगोन / Khargone' },
  { id: 'RAISEN', name: 'रायसेन / Raisen' },
  { id: 'VIDISHA', name: 'विदिशा / Vidisha' },
  { id: 'NARMADAPURAM', name: 'नर्मदापुरम / Narmadapuram' },
];

const FALLBACK_BLOCKS: Record<string, LocationItem[]> = {
  SEHORE: [
    { id: 'SEHORE_BLK', name: 'सीहोर (Sehore Block)' },
    { id: 'ASHTA', name: 'आष्टा (Ashta)' },
    { id: 'ICHHAWAR', name: 'इच्छावर (Ichhawar)' },
    { id: 'NASRULLAGANJ', name: 'नसरुल्लागंज / भेरूंदा (Bhairunda)' },
    { id: 'BUDNI', name: 'बुधनी (Budni)' },
  ],
  BHOPAL: [
    { id: 'PHANDA', name: 'फंदा (Phanda)' },
    { id: 'BERASIA', name: 'बैरसिया (Berasia)' },
  ],
  INDORE: [
    { id: 'INDORE_BLK', name: 'इंदौर (Indore)' },
    { id: 'SANWER', name: 'सांवेर (Sanwer)' },
    { id: 'DEPALPUR', name: 'देपालपुर (Depalpur)' },
    { id: 'MHOW', name: 'महू (Dr. Ambedkar Nagar / Mhow)' },
  ],
};

const FALLBACK_VILLAGES: Record<string, LocationItem[]> = {
  SEHORE_BLK: [
    { id: 'PRIYAPUR', name: 'पियापुर (Priyapur)' },
    { id: 'BILKISGANJ', name: 'बिलकिसगंज (Bilkisganj)' },
    { id: 'SHAMPUR', name: 'श्यामपुर (Shampur)' },
    { id: 'DORHA', name: 'दोरहा (Dorha)' },
    { id: 'MOGRARAM', name: 'मोगराराम (Mograram)' },
    { id: 'BIJOARI', name: 'बिजोरी (Bijori)' },
  ],
  PHANDA: [
    { id: 'KOLUA', name: 'कोलुआ (Kolua)' },
    { id: 'BARKHEDA', name: 'बरखेड़ा सालम (Barkheda Salam)' },
    { id: 'RATIBAD', name: 'रातीबड़ (Ratibad)' },
    { id: 'MUGALIYA', name: 'मुगालिया छाप (Mugaliya Chhap)' },
  ],
  SANWER: [
    { id: 'KANCHROD', name: 'कचरोद (Kachrod)' },
    { id: 'AJNOD', name: 'अजनोद (Ajnod)' },
    { id: 'DHANNAKHEDI', name: 'धन्नाखेड़ी (Dhannakhedi)' },
    { id: 'PALIA', name: 'पालिया (Palia)' },
  ],
};

export const locationApi = {
  // 1. GET DISTRICTS
  async getDistricts(stateId: string = 'MP'): Promise<LocationItem[]> {
    try {
      const baseUrl = await getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/locations/districts?stateId=${encodeURIComponent(stateId)}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      console.log('Location API fetch districts error (using fallback):', e);
    }
    return FALLBACK_DISTRICTS;
  },

  // 2. GET BLOCKS
  async getBlocks(districtId: string): Promise<LocationItem[]> {
    if (!districtId) return [];
    try {
      const baseUrl = await getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/locations/blocks?districtId=${encodeURIComponent(districtId)}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      console.log('Location API fetch blocks error (using fallback):', e);
    }

    const key = districtId.toUpperCase();
    if (FALLBACK_BLOCKS[key]) {
      return FALLBACK_BLOCKS[key];
    }
    return [
      { id: `${key}_BLK1`, name: `विकासखंड 1 (${districtId} मुख्य)` },
      { id: `${key}_BLK2`, name: `विकासखंड 2 (${districtId} उत्तर)` },
      { id: `${key}_BLK3`, name: `विकासखंड 3 (${districtId} दक्षिण)` },
    ];
  },

  // 3. GET VILLAGES
  async getVillages(blockId: string): Promise<LocationItem[]> {
    if (!blockId) return [];
    try {
      const baseUrl = await getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/locations/villages?blockId=${encodeURIComponent(blockId)}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      console.log('Location API fetch villages error (using fallback):', e);
    }

    const key = blockId.toUpperCase();
    if (FALLBACK_VILLAGES[key]) {
      return FALLBACK_VILLAGES[key];
    }
    return [
      { id: `${key}_VIL1`, name: `ग्राम पंचायत आदर्श नगर (${blockId})` },
      { id: `${key}_VIL2`, name: `ग्राम पंचायत कल्याणपुर` },
      { id: `${key}_VIL3`, name: `ग्राम पंचायत शिवपुरी` },
      { id: `${key}_VIL4`, name: `ग्राम पंचायत रामपुर` },
      { id: `${key}_VIL5`, name: `ग्राम पंचायत सुंदरपुर` },
    ];
  },

  // 4. GET WARDS
  async getWards(villageId: string): Promise<LocationItem[]> {
    if (!villageId) return [];
    try {
      const baseUrl = await getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/locations/wards?villageId=${encodeURIComponent(villageId)}`, {
        headers: { 'Content-Type': 'application/json' },
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) return data;
      }
    } catch (e) {
      console.log('Location API fetch wards error (using fallback):', e);
    }

    const wards: LocationItem[] = [];
    for (let i = 1; i <= 20; i++) {
      wards.push({ id: String(i), name: `वार्ड ${i} (Ward ${i})` });
    }
    return wards;
  },
};
