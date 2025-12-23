import { ValidationError, ValidationResult } from './tournamentValidation';

/**
 * User-friendly error message formatter
 * Requirements: 10.5
 */
export class ErrorMessageFormatter {
  /**
   * Format validation errors for display in UI
   * Groups errors by field and provides actionable suggestions
   */
  static formatValidationErrors(validation: ValidationResult): {
    title: string;
    message: string;
    suggestions: string[];
  } {
    if (validation.isValid) {
      return {
        title: 'Success',
        message: 'Configuration is valid',
        suggestions: [],
      };
    }

    const errors = validation.errors.filter(e => e.severity === 'error');
    const warnings = validation.errors.filter(e => e.severity === 'warning');

    // Group errors by field
    const errorsByField = new Map<string, ValidationError[]>();
    errors.forEach(error => {
      if (!errorsByField.has(error.field)) {
        errorsByField.set(error.field, []);
      }
      errorsByField.get(error.field)!.push(error);
    });

    // Build user-friendly message
    let message = '';
    const suggestions: string[] = [];

    if (errors.length === 1) {
      message = errors[0].message;
      suggestions.push(...this.getSuggestionsForError(errors[0]));
    } else if (errors.length > 1) {
      message = `Found ${errors.length} issue${errors.length > 1 ? 's' : ''}:\n\n`;
      errorsByField.forEach((fieldErrors, field) => {
        message += `• ${fieldErrors.map(e => e.message).join('\n• ')}\n`;
        fieldErrors.forEach(error => {
          suggestions.push(...this.getSuggestionsForError(error));
        });
      });
    }

    // Add warnings if present
    if (warnings.length > 0) {
      message += `\n\nWarnings:\n• ${warnings.map(w => w.message).join('\n• ')}`;
    }

    return {
      title: errors.length === 1 ? 'Configuration Error' : 'Configuration Errors',
      message: message.trim(),
      suggestions: [...new Set(suggestions)], // Remove duplicates
    };
  }

  /**
   * Get actionable suggestions for a specific error
   */
  private static getSuggestionsForError(error: ValidationError): string[] {
    const suggestions: string[] = [];

    switch (error.code) {
      case 'POOL_NAME_REQUIRED':
        suggestions.push('Enter a name for the pool (e.g., "Pool A", "Group 1")');
        break;

      case 'POOL_NAME_DUPLICATE':
        suggestions.push('Choose a different name that is not already in use');
        suggestions.push('Consider using letters (A, B, C) or numbers (1, 2, 3)');
        break;

      case 'POOL_MIN_TEAMS':
        suggestions.push('Add at least 2 teams to create a valid pool');
        suggestions.push('Pools need multiple teams to generate round-robin games');
        break;

      case 'POOL_MAX_TEAMS':
        suggestions.push('Remove teams to stay within the 16-team limit');
        suggestions.push('Consider splitting into multiple pools');
        break;

      case 'POOL_DUPLICATE_TEAMS':
        suggestions.push('Remove duplicate team names from the pool');
        suggestions.push('Each team can only appear once in a pool');
        break;

      case 'POOL_ADVANCEMENT_EXCEEDS_TEAMS':
        suggestions.push('Reduce the advancement count to match or be less than the team count');
        suggestions.push('Typically, 1-4 teams advance from each pool');
        break;

      case 'POOL_UPDATE_COMPLETED_GAMES':
        suggestions.push('Cannot modify teams after games have been completed');
        suggestions.push('Create a new pool if you need different teams');
        break;

      case 'TEAM_MULTIPLE_POOLS':
        suggestions.push('Remove the team from one of the pools');
        suggestions.push('Each team can only be in one pool at a time');
        break;

      case 'BRACKET_NAME_REQUIRED':
        suggestions.push('Enter a name for the bracket (e.g., "Gold Bracket", "Championship")');
        break;

      case 'BRACKET_NAME_DUPLICATE':
        suggestions.push('Choose a different name that is not already in use');
        suggestions.push('Consider using descriptive names like "Gold", "Silver", "Bronze"');
        break;

      case 'BRACKET_INVALID_SIZE':
        suggestions.push('Select a valid bracket size: 4, 8, 16, or 32 teams');
        suggestions.push('Bracket sizes must be powers of 2');
        break;

      case 'BRACKET_SEED_COUNT_MISMATCH':
        suggestions.push('Ensure the number of seeds matches the bracket size');
        break;

      case 'BRACKET_DUPLICATE_TEAMS':
        suggestions.push('Remove duplicate team assignments');
        suggestions.push('Each team can only be seeded once in a bracket');
        break;

      case 'BRACKET_UNSEEDED_POSITIONS':
        suggestions.push('Assign teams to all seed positions before starting the bracket');
        suggestions.push('Or use pool seeding to automatically fill positions');
        break;

      case 'BRACKET_DELETE_COMPLETED_GAMES':
        suggestions.push('Cannot delete bracket with completed games');
        suggestions.push('Completed games are part of the tournament record');
        break;

      case 'BRACKET_INVALID_DEPENDENCY':
        suggestions.push('Fix game dependencies - some games reference non-existent games');
        suggestions.push('Try regenerating the bracket structure');
        break;

      case 'BRACKET_CIRCULAR_DEPENDENCY':
        suggestions.push('Fix circular dependencies in bracket structure');
        suggestions.push('Regenerate the bracket to fix the structure');
        break;

      case 'GAME_HAS_DEPENDENCIES':
        suggestions.push('Cannot delete this game - other games depend on its result');
        suggestions.push('Delete dependent games first, or delete the entire bracket');
        break;

      case 'GAME_EDIT_AFFECTS_ADVANCEMENT':
        suggestions.push('Changing the score may affect which team advanced');
        suggestions.push('You may need to update the next round manually');
        break;

      case 'GAME_EDIT_TEAMS_ADVANCED':
        suggestions.push('Cannot change teams after winner has advanced');
        suggestions.push('Delete the bracket and recreate it if needed');
        break;

      case 'HYBRID_EXCESS_ADVANCING_TEAMS':
        suggestions.push('Reduce advancement counts in pools');
        suggestions.push('Or create larger brackets to accommodate more teams');
        break;

      case 'HYBRID_INSUFFICIENT_ADVANCING_TEAMS':
        suggestions.push('Increase advancement counts in pools');
        suggestions.push('Or create smaller brackets');
        suggestions.push('Some bracket positions will be empty (byes)');
        break;

      case 'HYBRID_POOLS_NO_ADVANCEMENT':
        suggestions.push('Set advancement count for each pool');
        suggestions.push('Typically 1-4 teams advance from each pool');
        break;

      case 'HYBRID_POOL_INCOMPLETE':
        suggestions.push('Complete all pool games before advancing to brackets');
        suggestions.push('Check the schedule for unplayed games');
        break;

      default:
        suggestions.push('Review the configuration and try again');
        break;
    }

    return suggestions;
  }

  /**
   * Format a simple error message for display
   */
  static formatError(error: Error): {
    title: string;
    message: string;
  } {
    return {
      title: 'Error',
      message: error.message || 'An unexpected error occurred',
    };
  }

  /**
   * Format a success message
   */
  static formatSuccess(message: string): {
    title: string;
    message: string;
  } {
    return {
      title: 'Success',
      message,
    };
  }

  /**
   * Format a confirmation message with warnings
   */
  static formatConfirmation(
    action: string,
    warnings: string[]
  ): {
    title: string;
    message: string;
    warnings: string[];
  } {
    return {
      title: `Confirm ${action}`,
      message: `Are you sure you want to ${action.toLowerCase()}?`,
      warnings,
    };
  }

  /**
   * Get user-friendly message for common operations
   */
  static getOperationMessage(operation: string, entityType: string, entityName?: string): string {
    const entity = entityName ? `"${entityName}"` : entityType;
    
    switch (operation) {
      case 'create':
        return `${entityType} created successfully`;
      case 'update':
        return `${entity} updated successfully`;
      case 'delete':
        return `${entity} deleted successfully`;
      case 'generate':
        return `Games generated for ${entity}`;
      case 'seed':
        return `${entity} seeded successfully`;
      case 'advance':
        return `Teams advanced to ${entity}`;
      default:
        return `Operation completed successfully`;
    }
  }
}

/**
 * Validation helper for UI components
 */
export class ValidationHelper {
  /**
   * Check if validation has errors (not just warnings)
   */
  static hasErrors(validation: ValidationResult): boolean {
    return validation.errors.some(e => e.severity === 'error');
  }

  /**
   * Check if validation has warnings
   */
  static hasWarnings(validation: ValidationResult): boolean {
    return validation.errors.some(e => e.severity === 'warning');
  }

  /**
   * Get only error messages
   */
  static getErrors(validation: ValidationResult): string[] {
    return validation.errors
      .filter(e => e.severity === 'error')
      .map(e => e.message);
  }

  /**
   * Get only warning messages
   */
  static getWarnings(validation: ValidationResult): string[] {
    return validation.errors
      .filter(e => e.severity === 'warning')
      .map(e => e.message);
  }

  /**
   * Get errors grouped by field
   */
  static getErrorsByField(validation: ValidationResult): Map<string, string[]> {
    const errorsByField = new Map<string, string[]>();
    
    validation.errors
      .filter(e => e.severity === 'error')
      .forEach(error => {
        if (!errorsByField.has(error.field)) {
          errorsByField.set(error.field, []);
        }
        errorsByField.get(error.field)!.push(error.message);
      });

    return errorsByField;
  }

  /**
   * Check if a specific field has errors
   */
  static fieldHasError(validation: ValidationResult, field: string): boolean {
    return validation.errors.some(
      e => e.field === field && e.severity === 'error'
    );
  }

  /**
   * Get error message for a specific field
   */
  static getFieldError(validation: ValidationResult, field: string): string | undefined {
    const error = validation.errors.find(
      e => e.field === field && e.severity === 'error'
    );
    return error?.message;
  }
}
