const entries = require('./data/faith_references');

const topicAliases = {
    patience: [
        'sabr',
        'sabar',
        'sabrr',
        'patience',
        'patient',
        'patiently',
        'perseverance',
        'endurance',
        'steadfast',
        'صبر',
        'الصبر',
        'بالصبر',
        'صابر',
        'صابرين',
        'صابرین',
        'صابرون',
        'صابرین',
    ],
    hardship: [
        'hardship',
        'hardships',
        'difficulty',
        'difficulties',
        'overwhelmed',
        'stress',
        'stressed',
        'adversity',
        'مصیبت',
        'مشکل',
        'مشکلات',
        'ابتلاء',
    ],
    hope: [
        'hope',
        'hopeful',
        'hopeless',
        'despair',
        'sad',
        'sadness',
        'low',
        'امید',
        'مایوسی',
        'اداس',
        'امل',
        'الأمل',
        'يأس',
    ],
    anger: [
        'anger',
        'angry',
        'irritable',
        'irritated',
        'rage',
        'conflict',
        'غصہ',
        'غصے',
        'غضب',
        'الغضب',
    ],
    calm: [
        'calm',
        'peace',
        'anxiety',
        'anxious',
        'worried',
        'worry',
        'سکون',
        'پریشان',
        'قلق',
        'طمأنينة',
    ],
    remembrance: ['dhikr', 'zikr', 'zikir', 'remembrance', 'ذكر', 'الذكر', 'ذکر'],
    gratitude: ['shukr', 'shukar', 'gratitude', 'grateful', 'thankful', 'شکر', 'شكر', 'الشكر'],
    repentance: [
        'tawbah',
        'taubah',
        'toba',
        'repentance',
        'repent',
        'guilt',
        'guilty',
        'mercy',
        'توبہ',
        'توبة',
        'التوبة',
        'رحمت',
        'رحمة',
    ],
    forgiveness: ['forgive', 'forgiveness', 'pardon', 'معاف', 'معافی', 'عفو', 'العفو'],
    trust: ['tawakkul', 'tawakul', 'reliance', 'trust', 'توکل', 'توكل', 'التوكل', 'بھروسہ'],
    prayer: ['salah', 'salat', 'namaz', 'prayer', 'نماز', 'صلاة', 'الصلاة'],
    charity: ['charity', 'sadaqah', 'صدقة', 'صدقہ'],
};

function normalize(text) {
    return text
        .normalize('NFKC')
        .toLowerCase()
        .replace(/\p{M}/gu, '')
        .replace(/ـ/g, '')
        .replace(/[أإآٱ]/g, 'ا')
        .replace(/[یى]/g, 'ي')
        .replace(/ک/g, 'ك');
}

const aliasToTopic = new Map();
for (const [topic, aliases] of Object.entries(topicAliases)) {
    for (const alias of aliases) aliasToTopic.set(normalize(alias), topic);
}

function getTopics(query) {
    const tokens = normalize(query).match(/[\p{L}\p{N}]+/gu) || [];
    return [...new Set(tokens.map((token) => aliasToTopic.get(token)).filter(Boolean))];
}

function isFaithQuery(query) {
    return (
        /\b(sabr|sabar|patience|perseverance|gratitude|repentance|forgiveness|quran|qur'an|hadith|hadees|verse|verses|ayah|ayat|sunnah|shukr|tawakkul|dhikr|zikr|tawbah)\b/i.test(
            query
        ) || /صبر|قر[اآ]ن|حديث|حدیث|ايات|آيات|توکل|توكل|ذکر|ذكر/.test(query)
    );
}

const declarations = ['quran', 'hadith'].map((type) => ({
    name: `search_${type}`,
    description: `Search a curated ${type} reference library. Topics include sabr/patience, hardship, anger, hope, gratitude, remembrance, trust, repentance and prayer. Accepts English, Roman Urdu, Urdu and Arabic keywords or a reference number. Results are source-linked summaries, not quotations.`,
    parametersJsonSchema: {
        type: 'object',
        properties: {
            query: {
                type: 'string',
                description:
                    'Topic or user question, for example sabr, patience, صبر, or Quran 2:153.',
            },
        },
        required: ['query'],
        additionalProperties: false,
    },
}));

function executeTool(name, args) {
    if (!['search_quran', 'search_hadith'].includes(name)) return { error: 'Unknown tool.' };
    if (typeof args?.query !== 'string' || !args.query.trim() || args.query.length > 500) {
        return { error: 'Tool query must contain 1 to 500 characters.' };
    }
    const query = normalize(args.query);
    const matchedTopics = getTopics(query);
    const referenceNumber = query.match(/\b\d+(?:[:/]\d+)?\b/)?.[0]?.replace('/', ':');
    const ranked = entries
        .filter((entry) => entry.type === name.slice(7))
        .map((entry) => {
            const number = entry.reference.match(/\d+(?::\d+)?/)?.[0];
            const exactReference = referenceNumber && number === referenceNumber;
            const overlap = entry.topics.filter((topic) => matchedTopics.includes(topic)).length;
            return { entry, score: exactReference ? 100 : overlap };
        })
        .filter(({ score }) => score > 0)
        .sort((a, b) => b.score - a.score)
        .slice(0, 4);
    return {
        results: ranked.map(({ entry: { topics, ...entry } }) => entry),
        matchedTopics,
        scope: 'Curated local reference library; not a complete Quran or Hadith search. No match describes this library only, not the existence of scripture on the topic.',
        textType: 'paraphrase',
    };
}

module.exports = { declarations, executeTool, getTopics, isFaithQuery };
