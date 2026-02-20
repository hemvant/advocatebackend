'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('case_hearings', 'courtroom_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'courtrooms', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('case_hearings', 'judge_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'judges', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('case_hearings', 'bench_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'court_benches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addIndex('case_hearings', ['courtroom_id'], { name: 'case_hearings_courtroom_id_idx' });
    await queryInterface.addIndex('case_hearings', ['judge_id'], { name: 'case_hearings_judge_id_idx' });
    await queryInterface.addIndex('case_hearings', ['bench_id'], { name: 'case_hearings_bench_id_idx' });
  },

  async down(queryInterface) {
    await queryInterface.removeIndex('case_hearings', 'case_hearings_bench_id_idx');
    await queryInterface.removeIndex('case_hearings', 'case_hearings_judge_id_idx');
    await queryInterface.removeIndex('case_hearings', 'case_hearings_courtroom_id_idx');
    await queryInterface.removeColumn('case_hearings', 'bench_id');
    await queryInterface.removeColumn('case_hearings', 'judge_id');
    await queryInterface.removeColumn('case_hearings', 'courtroom_id');
  }
};
