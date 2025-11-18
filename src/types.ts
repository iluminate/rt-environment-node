export interface EnvironmentConfigurationResponse {
  id: number;
  microservice: {
    id: number;
    name: string;
  };
  key: string;
  value: string;
  type: string;
  description: string;
  updated_by: string;
  updated_at: string;
}