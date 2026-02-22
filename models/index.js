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
const CourtType = require('./CourtType');
const Court = require('./Court');
const CourtBench = require('./CourtBench');
const Courtroom = require('./Courtroom');
const Judge = require('./Judge');
const CourtWorkingDay = require('./CourtWorkingDay');
const Case = require('./Case');
const CaseHearing = require('./CaseHearing');
const CaseDocument = require('./CaseDocument');
const DocumentVersion = require('./DocumentVersion');
const HearingReminder = require('./HearingReminder');
const AuditLog = require('./AuditLog');
const CaseTask = require('./CaseTask');
const CasePermission = require('./CasePermission');
const DocumentPermission = require('./DocumentPermission');
const CaseAssignmentHistory = require('./CaseAssignmentHistory');
const CaseJudgeHistory = require('./CaseJudgeHistory');
const PlatformSetting = require('./PlatformSetting');
const SystemMetric = require('./SystemMetric');
const SuperAdminLoginAttempt = require('./SuperAdminLoginAttempt')(sequelize, require('sequelize').DataTypes);
const ImpersonationLog = require('./ImpersonationLog');
const Subscription = require('./Subscription');
const Invoice = require('./Invoice');
const Package = require('./Package');
const PackageModule = require('./PackageModule');
const OrganizationSetupProgress = require('./OrganizationSetupProgress');

Organization.hasMany(OrganizationUser, { foreignKey: 'organization_id' });
Organization.hasOne(OrganizationSetupProgress, { foreignKey: 'organization_id' });
OrganizationSetupProgress.belongsTo(Organization, { foreignKey: 'organization_id' });
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

CourtType.hasMany(Court, { foreignKey: 'court_type_id' });
Court.belongsTo(CourtType, { foreignKey: 'court_type_id' });
Court.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(Court, { foreignKey: 'organization_id' });
Court.hasMany(CourtBench, { foreignKey: 'court_id' });
CourtBench.belongsTo(Court, { foreignKey: 'court_id' });
Court.hasMany(Courtroom, { foreignKey: 'court_id' });
Courtroom.belongsTo(Court, { foreignKey: 'court_id' });
Courtroom.belongsTo(CourtBench, { foreignKey: 'bench_id', as: 'Bench' });
CourtBench.hasMany(Courtroom, { foreignKey: 'bench_id' });
Court.hasMany(Judge, { foreignKey: 'court_id' });
Judge.belongsTo(Court, { foreignKey: 'court_id' });
Judge.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(Judge, { foreignKey: 'organization_id' });
Judge.belongsTo(CourtBench, { foreignKey: 'bench_id', as: 'Bench' });
CourtBench.hasMany(Judge, { foreignKey: 'bench_id' });
Court.hasMany(CourtWorkingDay, { foreignKey: 'court_id' });
CourtWorkingDay.belongsTo(Court, { foreignKey: 'court_id' });

Case.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(Case, { foreignKey: 'organization_id' });
Case.belongsTo(Court, { foreignKey: 'court_id' });
Court.hasMany(Case, { foreignKey: 'court_id' });
Case.belongsTo(CourtBench, { foreignKey: 'bench_id', as: 'Bench' });
CourtBench.hasMany(Case, { foreignKey: 'bench_id' });
Case.belongsTo(Judge, { foreignKey: 'judge_id' });
Judge.hasMany(Case, { foreignKey: 'judge_id' });
Case.belongsTo(Courtroom, { foreignKey: 'courtroom_id' });
Courtroom.hasMany(Case, { foreignKey: 'courtroom_id' });
Case.belongsTo(Client, { foreignKey: 'client_id' });
Client.hasMany(Case, { foreignKey: 'client_id' });
Case.belongsTo(OrganizationUser, { foreignKey: 'created_by', as: 'Creator' });
Case.belongsTo(OrganizationUser, { foreignKey: 'assigned_to', as: 'Assignee' });
OrganizationUser.hasMany(Case, { foreignKey: 'created_by' });
OrganizationUser.hasMany(Case, { foreignKey: 'assigned_to' });
Case.hasMany(CaseHearing, { foreignKey: 'case_id' });
CaseHearing.belongsTo(Case, { foreignKey: 'case_id' });
CaseHearing.belongsTo(CaseHearing, { foreignKey: 'previous_hearing_id', as: 'PreviousHearing' });
CaseHearing.hasMany(CaseHearing, { foreignKey: 'previous_hearing_id' });
Case.hasMany(CaseAssignmentHistory, { foreignKey: 'case_id', as: 'AssignmentHistory' });
CaseAssignmentHistory.belongsTo(Case, { foreignKey: 'case_id' });
CaseAssignmentHistory.belongsTo(OrganizationUser, { foreignKey: 'employee_id', as: 'Employee' });
CaseAssignmentHistory.belongsTo(OrganizationUser, { foreignKey: 'assigned_by', as: 'AssignedByUser' });
OrganizationUser.hasMany(CaseAssignmentHistory, { foreignKey: 'employee_id' });
OrganizationUser.hasMany(CaseAssignmentHistory, { foreignKey: 'assigned_by' });
Case.hasMany(CaseJudgeHistory, { foreignKey: 'case_id', as: 'JudgeHistory' });
CaseJudgeHistory.belongsTo(Case, { foreignKey: 'case_id' });
CaseJudgeHistory.belongsTo(Judge, { foreignKey: 'judge_id', as: 'Judge' });
Judge.hasMany(CaseJudgeHistory, { foreignKey: 'judge_id' });
CaseHearing.belongsTo(Courtroom, { foreignKey: 'courtroom_id' });
Courtroom.hasMany(CaseHearing, { foreignKey: 'courtroom_id' });
CaseHearing.belongsTo(Judge, { foreignKey: 'judge_id' });
Judge.hasMany(CaseHearing, { foreignKey: 'judge_id' });
CaseHearing.belongsTo(CourtBench, { foreignKey: 'bench_id', as: 'Bench' });
CourtBench.hasMany(CaseHearing, { foreignKey: 'bench_id' });
CaseHearing.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(CaseHearing, { foreignKey: 'organization_id' });
CaseHearing.belongsTo(OrganizationUser, { foreignKey: 'created_by', as: 'Creator' });
OrganizationUser.hasMany(CaseHearing, { foreignKey: 'created_by' });
CaseHearing.hasMany(HearingReminder, { foreignKey: 'hearing_id' });
HearingReminder.belongsTo(CaseHearing, { foreignKey: 'hearing_id' });
Case.hasMany(CaseDocument, { foreignKey: 'case_id' });
CaseDocument.belongsTo(Case, { foreignKey: 'case_id' });
Case.hasMany(CaseTask, { foreignKey: 'case_id' });
CaseTask.belongsTo(Case, { foreignKey: 'case_id' });
Case.hasMany(CasePermission, { foreignKey: 'case_id' });
CasePermission.belongsTo(Case, { foreignKey: 'case_id' });
CasePermission.belongsTo(OrganizationUser, { foreignKey: 'user_id', as: 'User' });
OrganizationUser.hasMany(CasePermission, { foreignKey: 'user_id' });
CaseDocument.hasMany(DocumentPermission, { foreignKey: 'document_id' });
DocumentPermission.belongsTo(CaseDocument, { foreignKey: 'document_id' });
DocumentPermission.belongsTo(OrganizationUser, { foreignKey: 'user_id', as: 'User' });
OrganizationUser.hasMany(DocumentPermission, { foreignKey: 'user_id' });
CaseTask.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(CaseTask, { foreignKey: 'organization_id' });
CaseTask.belongsTo(OrganizationUser, { foreignKey: 'assigned_to', as: 'Assignee' });
CaseTask.belongsTo(OrganizationUser, { foreignKey: 'created_by', as: 'Creator' });
OrganizationUser.hasMany(CaseTask, { foreignKey: 'assigned_to' });
OrganizationUser.hasMany(CaseTask, { foreignKey: 'created_by' });
CaseDocument.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(CaseDocument, { foreignKey: 'organization_id' });
CaseDocument.belongsTo(OrganizationUser, { foreignKey: 'uploaded_by', as: 'Uploader' });
OrganizationUser.hasMany(CaseDocument, { foreignKey: 'uploaded_by' });
CaseDocument.hasMany(DocumentVersion, { foreignKey: 'document_id' });
DocumentVersion.belongsTo(CaseDocument, { foreignKey: 'document_id' });
DocumentVersion.belongsTo(Organization, { foreignKey: 'organization_id' });
Organization.hasMany(DocumentVersion, { foreignKey: 'organization_id' });
DocumentVersion.belongsTo(OrganizationUser, { foreignKey: 'uploaded_by', as: 'Uploader' });
DocumentVersion.belongsTo(OrganizationUser, { foreignKey: 'changed_by', as: 'Changer' });
OrganizationUser.hasMany(DocumentVersion, { foreignKey: 'uploaded_by' });
OrganizationUser.hasMany(DocumentVersion, { foreignKey: 'changed_by' });

AuditLog.belongsTo(Organization, { foreignKey: 'organization_id' });
AuditLog.belongsTo(OrganizationUser, { foreignKey: 'user_id', as: 'User' });
Organization.hasMany(AuditLog, { foreignKey: 'organization_id' });
OrganizationUser.hasMany(AuditLog, { foreignKey: 'user_id' });

Organization.hasMany(Subscription, { foreignKey: 'organization_id' });
Subscription.belongsTo(Organization, { foreignKey: 'organization_id' });
Subscription.belongsTo(Package, { foreignKey: 'package_id' });
Package.hasMany(Subscription, { foreignKey: 'package_id' });
Organization.hasMany(Invoice, { foreignKey: 'organization_id' });
Invoice.belongsTo(Organization, { foreignKey: 'organization_id' });
Invoice.belongsTo(Subscription, { foreignKey: 'subscription_id' });
Subscription.hasMany(Invoice, { foreignKey: 'subscription_id' });
Invoice.belongsTo(Package, { foreignKey: 'package_id' });
Package.hasMany(Invoice, { foreignKey: 'package_id' });

Package.belongsToMany(Module, {
  through: PackageModule,
  foreignKey: 'package_id',
  otherKey: 'module_id',
  as: 'Modules'
});
Module.belongsToMany(Package, {
  through: PackageModule,
  foreignKey: 'module_id',
  otherKey: 'package_id',
  as: 'Packages'
});
PackageModule.belongsTo(Package, { foreignKey: 'package_id' });
PackageModule.belongsTo(Module, { foreignKey: 'module_id' });
Package.hasMany(PackageModule, { foreignKey: 'package_id' });
Module.hasMany(PackageModule, { foreignKey: 'module_id' });

module.exports = {
  sequelize,
  SuperAdmin,
  Organization,
  OrganizationUser,
  Module,
  OrganizationModule,
  EmployeeModule,
  CourtType,
  Court,
  CourtBench,
  Courtroom,
  Judge,
  CourtWorkingDay,
  Client,
  ClientOpponent,
  ClientTag,
  ClientTagMap,
  Case,
  CaseHearing,
  CaseDocument,
  DocumentVersion,
  HearingReminder,
  AuditLog,
  CaseTask,
  CasePermission,
  DocumentPermission,
  CaseAssignmentHistory,
  CaseJudgeHistory,
  PlatformSetting,
  SystemMetric,
  SuperAdminLoginAttempt,
  ImpersonationLog,
  Subscription,
  Invoice,
  Package,
  PackageModule,
  OrganizationSetupProgress
};
