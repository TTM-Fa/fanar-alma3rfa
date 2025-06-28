/**
 * Analytics utility for Code Mentor feature
 * Tracks usage patterns and feature adoption
 */

class CodeMentorAnalytics {
  static sessionId = null;
  static startTime = null;

  /**
   * Initialize analytics session
   */
  static initSession() {
    this.sessionId = this.generateSessionId();
    this.startTime = Date.now();
    this.trackEvent("session_started");
  }

  /**
   * Generate unique session ID
   */
  static generateSessionId() {
    return "cm_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Track feature usage
   */
  static trackAnalysis(
    analysisType,
    language,
    codeLength,
    success = true,
    error = null
  ) {
    const event = {
      type: "code_analysis",
      analysis_type: analysisType,
      language: language,
      code_length: codeLength,
      success: success,
      error: error?.message || null,
      timestamp: Date.now(),
      session_id: this.sessionId,
    };

    this.sendEvent(event);
  }

  /**
   * Track user interactions
   */
  static trackInteraction(action, details = {}) {
    const event = {
      type: "user_interaction",
      action: action,
      details: details,
      timestamp: Date.now(),
      session_id: this.sessionId,
    };

    this.sendEvent(event);
  }

  /**
   * Track errors
   */
  static trackError(error, context = {}) {
    const event = {
      type: "error",
      error_message: error.message,
      error_stack: error.stack,
      context: context,
      timestamp: Date.now(),
      session_id: this.sessionId,
    };

    this.sendEvent(event);
  }

  /**
   * Track performance metrics
   */
  static trackPerformance(action, duration, success = true) {
    const event = {
      type: "performance",
      action: action,
      duration: duration,
      success: success,
      timestamp: Date.now(),
      session_id: this.sessionId,
    };

    this.sendEvent(event);
  }

  /**
   * Track session end
   */
  static endSession() {
    const sessionDuration = Date.now() - this.startTime;

    const event = {
      type: "session_ended",
      duration: sessionDuration,
      timestamp: Date.now(),
      session_id: this.sessionId,
    };

    this.sendEvent(event);
  }

  /**
   * Generic event tracking
   */
  static trackEvent(eventName, data = {}) {
    const event = {
      event: eventName,
      data: data,
      timestamp: Date.now(),
      session_id: this.sessionId,
    };

    this.sendEvent(event);
  }

  /**
   * Send event to analytics service
   * In a real implementation, this would send to your analytics service
   */
  static sendEvent(event) {
    // For development, just log to console
    if (process.env.NODE_ENV === "development") {
      console.log("📊 Code Mentor Analytics:", event);
    }

    // In production, you would send this to your analytics service
    // Example:
    // fetch('/api/analytics', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify(event)
    // });
  }

  /**
   * Get session statistics
   */
  static getSessionStats() {
    return {
      sessionId: this.sessionId,
      startTime: this.startTime,
      duration: this.startTime ? Date.now() - this.startTime : 0,
    };
  }
}

// Helper functions for common tracking scenarios
export const trackCodeAnalysis = (type, language, code, success, error) => {
  CodeMentorAnalytics.trackAnalysis(
    type,
    language,
    code.length,
    success,
    error
  );
};

export const trackUserAction = (action, details) => {
  CodeMentorAnalytics.trackInteraction(action, details);
};

export const trackApiCall = async (apiCall, context) => {
  const startTime = Date.now();

  try {
    const result = await apiCall();
    const duration = Date.now() - startTime;
    CodeMentorAnalytics.trackPerformance(context.action, duration, true);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    CodeMentorAnalytics.trackPerformance(context.action, duration, false);
    CodeMentorAnalytics.trackError(error, context);
    throw error;
  }
};

export default CodeMentorAnalytics;
