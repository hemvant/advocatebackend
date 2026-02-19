const { sequelize } = require('../utils/db');
const SuperAdmin = require('./SuperAdmin');
const Organization = require('./Organization');
const OrganizationUser = require('./OrganizationUser');
const Module = require('./Module');
const OrganizationModule = require('./OrganizationModule');
const EmployeeModule = require('./EmployeeModule');
const Client = require('./Client');
const ClientOpponent = require('./ClientOpponent');
const ClientTag = require('./ClientTag');
const ClientTagMap = require('./ClientTagMap');
const Case = require('./Case');
const CaseHearing = require('./CaseHearing');
const CaseDocument = require('./CaseDocument');
const DocumentVersion = require('./DocumentVersion');
const HearingReminder = require('./HearingReminder');

Organization.hasMany(OrganizationUser, { foreignKey: 'organization_id' });
OrganizationUser.belongsTo(Organization, { foreignKey: 'organization_id' });

Organization.belongsToMany(Module, {
  through: OrganizationModule,
  foreignKey: 'organization_id',
  otherKey: 'module_id'
});
Module.belongsToMany(Organization, {
  through: OrganizationModule,
  foreignKey: 'module_id',
  otherKey: 'organization_id'
});

OrganizationModule.belongsTo(Organization, { foreignKey: 'organization_id' });
OrganizationModule.belongsTo(Module, { foreignKey: 'module_id' });
Organization.hasMany(OrganizationModule, { foreignKey: 'organization_id' });
Module.hasMany(OrganizationModule, { foreignKey: 'module_id' });

OrganizationUser.belongsToMany(Module, {
  through: EmployeeModule,
  foreignKey: 'organization_user_id',
  otherKey: 'module_id'
});
Module.belongsToMany(OrganizationUser, {
  through: EmployeeModule,
  foreignKey: 'module_id',
  otherKey: 'organization_user_id'
});

EmployeeModule.belongsTo(OrganizationUser, { foreignKey: 'organization_user_id' });
EmployeeModule.belongsTo(Module, { foreignKey: 'module_id' });
OrganizationUser.hasMany(EmployeeModule, { foreignKey: 'organization_user_id' });
Module.hasMany(EmployeeModule, { foreignKey: 'module_id' });

Client.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(Client, { foreignKey: 'organization_id' });
Client.belongsTo(OrganizationUser, { foreignKey: 'created_by', as: 'Creator' });
Client.belongsTo(OrganizationUser, { foreignKey: 'assigned_to', as: 'Assignee' });
OrganizationUser.hasMany(Client, { foreignKey: 'created_by' });
OrganizationUser.hasMany(Client, { foreignKey: 'assigned_to' });
Client.hasMany(ClientOpponent, { foreignKey: 'client_id' });
ClientOpponent.belongsTo(Client, { foreignKey: 'client_id' });
Client.belongsToMany(ClientTag, {
  through: ClientTagMap,
  foreignKey: 'client_id',
  otherKey: 'tag_id',
  as: 'Tags'
});
ClientTag.belongsToMany(Client, {
  through: ClientTagMap,
  foreignKey: 'tag_id',
  otherKey: 'client_id',
  as: 'Clients'
});
ClientTag.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(ClientTag, { foreignKey: 'organization_id' });
ClientTagMap.belongsTo(Client, { foreignKey: 'client_id' });
ClientTagMap.belongsTo(ClientTag, { foreignKey: 'tag_id' });
Client.hasMany(ClientTagMap, { foreignKey: 'client_id' });
ClientTag.hasMany(ClientTagMap, { foreignKey: 'tag_id' });

Case.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(Case, { foreignKey: 'organization_id' });
Case.belongsTo(Client, { foreignKey: 'client_id' });
Client.hasMany(Case, { foreignKey: 'client_id' });
Case.belongsTo(OrganizationUser, { foreignKey: 'created_by', as: 'Creator' });
Case.belongsTo(OrganizationUser, { foreignKey: 'assigned_to', as: 'Assignee' });
OrganizationUser.hasMany(Case, { foreignKey: 'created_by' });
OrganizationUser.hasMany(Case, { foreignKey: 'assigned_to' });
Case.hasMany(CaseHearing, { foreignKey: 'case_id' });
CaseHearing.belongsTo(Case, { foreignKey: 'case_id' });
CaseHearing.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(CaseHearing, { foreignKey: 'organization_id' });
CaseHearing.belongsTo(OrganizationUser, { foreignKey: 'created_by', as: 'Creator' });
OrganizationUser.hasMany(CaseHearing, { foreignKey: 'created_by' });
CaseHearing.hasMany(HearingReminder, { foreignKey: 'hearing_id' });
HearingReminder.belongsTo(CaseHearing, { foreignKey: 'hearing_id' });
Case.hasMany(CaseDocument, { foreignKey: 'case_id' });
CaseDocument.belongsTo(Case, { foreignKey: 'case_id' });
CaseDocument.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(CaseDocument, { foreignKey: 'organization_id' });
CaseDocument.belongsTo(OrganizationUser, { foreignKey: 'uploaded_by', as: 'Uploader' });
OrganizationUser.hasMany(CaseDocument, { foreignKey: 'uploaded_by' });
CaseDocument.hasMany(DocumentVersion, { foreignKey: 'document_id' });
DocumentVersion.belongsTo(CaseDocument, { foreignKey: 'document_id' });
DocumentVersion.belongsTo(OrganizationUser, { foreignKey: 'uploaded_by', as: 'Uploader' });
OrganizationUser.hasMany(DocumentVersion, { foreignKey: 'uploaded_by' });

module.exports = {
  sequelize,
  SuperAdmin,
  Organization,
  OrganizationUser,
  Module,
  OrganizationModule,
  EmployeeModule,
  Client,
  ClientOpponent,
  ClientTag,
  ClientTagMap,
  Case,
  CaseHearing,
  CaseDocument,
  DocumentVersion,
  HearingReminder
};
