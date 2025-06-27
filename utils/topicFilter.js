// topicFilter.js - Utility functions for topic-based content filtering
import {
  filterContentByTopics,
  extractTopicsFromContent,
  getContentStatistics,
} from "./fileProcessors.js";



/**
 * Helper function to get filtered content for a specific material
 * This can be used in API endpoints or frontend components
 *
 * @param {Object} material - Material object from database
 * @param {Array<string>} selectedTopics - Topics to filter by
 * @param {boolean} exactMatch - Whether to use exact matching
 * @returns {Object} - Filtered content and metadata
 */
export function getFilteredMaterialContent(
  material,
  selectedTopics,
  exactMatch = false
) {
  if (!material || !material.rawContent) {
    return {
      content: "",
      availableTopics: [],
      selectedTopics: [],
      statistics: { pageCount: 0, topics: [], totalCharacters: 0 },
    };
  }

  const availableTopics = extractTopicsFromContent(material.rawContent);
  const statistics = getContentStatistics(material.rawContent);

  // If no topics specified, return all content
  if (!selectedTopics || selectedTopics.length === 0) {
    return {
      content: material.rawContent,
      availableTopics,
      selectedTopics: [],
      statistics,
    };
  }

  // Filter content by topics
  const filteredContent = filterContentByTopics(
    material.rawContent,
    selectedTopics,
    exactMatch
  );
  const filteredStats = getContentStatistics(filteredContent);

  return {
    content: filteredContent,
    availableTopics,
    selectedTopics,
    statistics: filteredStats,
    originalStatistics: statistics,
  };
}

/**
 * Get topic suggestions based on existing content
 * This can help users discover related topics in their materials
 *
 * @param {Array<Object>} materials - Array of material objects
 * @returns {Object} - Topic analysis and suggestions
 */
export function getTopicSuggestions(materials) {
  const topicFrequency = new Map();
  const topicsByMaterial = new Map();

  materials.forEach((material) => {
    if (material.topics && Array.isArray(material.topics)) {
      topicsByMaterial.set(material.id, material.topics);

      material.topics.forEach((topic) => {
        const lowerTopic = topic.toLowerCase().trim();
        topicFrequency.set(
          lowerTopic,
          (topicFrequency.get(lowerTopic) || 0) + 1
        );
      });
    }
  });

  // Sort topics by frequency
  const sortedTopics = Array.from(topicFrequency.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([topic, count]) => ({ topic, count }));

  return {
    mostPopularTopics: sortedTopics.slice(0, 10),
    totalUniqueTopics: sortedTopics.length,
    topicsByMaterial: Object.fromEntries(topicsByMaterial),
    allTopics: sortedTopics.map((item) => item.topic),
  };
}

export default {
  testTopicFiltering,
  getFilteredMaterialContent,
  getTopicSuggestions,
};