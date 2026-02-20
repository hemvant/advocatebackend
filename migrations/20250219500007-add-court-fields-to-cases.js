'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('cases', 'court_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'courts', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('cases', 'bench_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'court_benches', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('cases', 'judge_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'judges', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('cases', 'courtroom_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'courtrooms', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addIndex('cases', ['court_id'], { name: 'cases_court_id_idx' });
    await queryInterface.addIndex('cases', ['bench_id'], { name: 'cases_bench_id_idx' });
    await queryInterface.addIndex('cases', ['judge_id'], { name: 'cases_judge_id_idx' });
    await queryInterface.addIndex('cases', ['courtroom_id'], { name: 'cases_courtroom_id_idx' });
    await queryInterface.removeColumn('cases', 'court_name');
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('cases', 'cases_courtroom_id_idx');
    await queryInterface.removeIndex('cases', 'cases_judge_id_idx');
    await queryInterface.removeIndex('cases', 'cases_bench_id_idx');
    await queryInterface.removeIndex('cases', 'cases_court_id_idx');
    await queryInterface.removeColumn('cases', 'courtroom_id');
    await queryInterface.removeColumn('cases', 'judge_id');
    await queryInterface.removeColumn('cases', 'bench_id');
    await queryInterface.removeColumn('cases', 'court_id');
    await queryInterface.addColumn('cases', 'court_name', { type: Sequelize.STRING(255), allowNull: true });
  }
};
