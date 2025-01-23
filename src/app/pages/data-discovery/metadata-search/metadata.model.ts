
export class MetadataVariables {
  variable_name: string;
  variable_description:string;
  datatype: string;
  values: string[];
  entity: string;
  dataset: string[]

  constructor(MetadataVariables: { variable_name: string; variable_description: string; datatype: string; 
    values: string[]; entity: string; dataset: string[]; }) { 
    
    {
      this.variable_name = MetadataVariables.variable_name || '';
      this.variable_description = MetadataVariables.variable_description || '';
      this.datatype = MetadataVariables.datatype || '';
      this.values = MetadataVariables.values || '';
      this.entity = MetadataVariables.entity || '';
      this.dataset = MetadataVariables.dataset || '';
    }
  }
 
}
