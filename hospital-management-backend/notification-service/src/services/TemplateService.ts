import NotificationTemplate, { INotificationTemplate } from '../models/NotificationTemplate';
import { logger } from '@hospital/shared';

export class TemplateService {
  
  public async getTemplate(templateName: string, templateType: string): Promise<INotificationTemplate | null> {
    try {
      const template = await NotificationTemplate.findOne({
        template_name: templateName,
        template_type: templateType,
        is_active: true
      });

      if (!template) {
        logger.warn('Template not found', { templateName, templateType });
        return null;
      }

      return template;
    } catch (error) {
      logger.error('Error fetching template:', error);
      throw error;
    }
  }

  public async renderTemplate(
    templateName: string, 
    templateType: string, 
    variables: Record<string, any>
  ): Promise<{ subject: string; body: string } | null> {
    try {
      const template = await this.getTemplate(templateName, templateType);
      
      if (!template) {
        return null;
      }

      // Replace variables in subject and body
      let subject = template.subject;
      let body = template.body;

      // Replace {{variable}} with actual values
      for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        subject = subject.replace(regex, String(value));
        body = body.replace(regex, String(value));
      }

      logger.info('Template rendered successfully', {
        templateName,
        templateType,
        variableCount: Object.keys(variables).length
      });

      return { subject, body };
    } catch (error) {
      logger.error('Error rendering template:', error);
      throw error;
    }
  }

  public async createTemplate(templateData: {
    template_name: string;
    template_type: 'email' | 'sms' | 'push' | 'web';
    subject: string;
    body: string;
    variables?: string[];
    is_active?: boolean;
  }): Promise<INotificationTemplate> {
    try {
      const template = new NotificationTemplate({
        ...templateData,
        variables: templateData.variables || [],
        is_active: templateData.is_active !== undefined ? templateData.is_active : true
      });

      await template.save();
      
      logger.info('Template created successfully', {
        templateName: templateData.template_name,
        templateType: templateData.template_type
      });

      return template;
    } catch (error) {
      logger.error('Error creating template:', error);
      throw error;
    }
  }

  public async updateTemplate(
    templateName: string,
    templateType: string,
    updateData: Partial<{
      subject: string;
      body: string;
      variables: string[];
      is_active: boolean;
    }>
  ): Promise<INotificationTemplate | null> {
    try {
      const template = await NotificationTemplate.findOneAndUpdate(
        { template_name: templateName, template_type: templateType },
        { ...updateData, updated_at: new Date() },
        { new: true }
      );

      if (!template) {
        logger.warn('Template not found for update', { templateName, templateType });
        return null;
      }

      logger.info('Template updated successfully', {
        templateName,
        templateType
      });

      return template;
    } catch (error) {
      logger.error('Error updating template:', error);
      throw error;
    }
  }

  public async getAllTemplates(filters?: {
    template_type?: string;
    is_active?: boolean;
  }): Promise<INotificationTemplate[]> {
    try {
      const query: any = {};
      
      if (filters?.template_type) {
        query.template_type = filters.template_type;
      }
      
      if (filters?.is_active !== undefined) {
        query.is_active = filters.is_active;
      }

      const templates = await NotificationTemplate.find(query)
        .sort({ template_name: 1, template_type: 1 });

      return templates;
    } catch (error) {
      logger.error('Error fetching templates:', error);
      throw error;
    }
  }

  public async deleteTemplate(templateName: string, templateType: string): Promise<boolean> {
    try {
      const result = await NotificationTemplate.deleteOne({
        template_name: templateName,
        template_type: templateType
      });

      if (result.deletedCount === 0) {
        logger.warn('Template not found for deletion', { templateName, templateType });
        return false;
      }

      logger.info('Template deleted successfully', {
        templateName,
        templateType
      });

      return true;
    } catch (error) {
      logger.error('Error deleting template:', error);
      throw error;
    }
  }

  // Helper method to extract variables from template body
  public extractVariables(templateBody: string): string[] {
    const variableRegex = /{{(\w+)}}/g;
    const variables: string[] = [];
    let match;

    while ((match = variableRegex.exec(templateBody)) !== null) {
      if (!variables.includes(match[1])) {
        variables.push(match[1]);
      }
    }

    return variables;
  }

  // Validate that all required variables are provided
  public validateVariables(template: INotificationTemplate, variables: Record<string, any>): {
    isValid: boolean;
    missingVariables: string[];
  } {
    const missingVariables: string[] = [];
    
    for (const requiredVar of template.variables) {
      if (!(requiredVar in variables) || variables[requiredVar] === undefined || variables[requiredVar] === null) {
        missingVariables.push(requiredVar);
      }
    }

    return {
      isValid: missingVariables.length === 0,
      missingVariables
    };
  }
}
