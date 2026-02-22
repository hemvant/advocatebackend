'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. organization_users: add status (active | inactive | left)
    await queryInterface.addColumn('organization_users', 'status', {
      type: Sequelize.ENUM('active', 'inactive', 'left'),
      allowNull: true
    });
    await queryInterface.sequelize.query(
      "UPDATE organization_users SET status = IF(is_active = 1, 'active', 'inactive') WHERE status IS NULL"
    );
    await queryInterface.changeColumn('organization_users', 'status', {
      type: Sequelize.ENUM('active', 'inactive', 'left'),
      allowNull: false,
      defaultValue: 'active'
    });

    // 2. case_assignment_history
    await queryInterface.createTable('case_assignment_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      case_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'cases', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      employee_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      unassigned_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      assigned_by: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: 'organization_users', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      reason: {
        type: Sequelize.STRING(100),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('case_assignment_history', ['case_id'], { name: 'case_assignment_history_case_id_idx' });
    await queryInterface.addIndex('case_assignment_history', ['employee_id'], { name: 'case_assignment_history_employee_id_idx' });

    // 3. judges: add status (active | transferred | retired)
    await queryInterface.addColumn('judges', 'status', {
      type: Sequelize.ENUM('active', 'transferred', 'retired'),
      allowNull: true
    });
    await queryInterface.sequelize.query(
      "UPDATE judges SET status = IF(is_active = 1, 'active', 'transferred') WHERE status IS NULL"
    );
    await queryInterface.changeColumn('judges', 'status', {
      type: Sequelize.ENUM('active', 'transferred', 'retired'),
      allowNull: false,
      defaultValue: 'active'
    });

    // 4. case_judge_history
    await queryInterface.createTable('case_judge_history', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      case_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'cases', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      judge_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: 'judges', key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      assigned_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      unassigned_at: {
        type: Sequelize.DATE,
        allowNull: true
      },
      transfer_reason: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      created_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updated_at: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP')
      }
    });
    await queryInterface.addIndex('case_judge_history', ['case_id'], { name: 'case_judge_history_case_id_idx' });
    await queryInterface.addIndex('case_judge_history', ['judge_id'], { name: 'case_judge_history_judge_id_idx' });

    // 5. case_hearings: hearing_number, previous_hearing_id, outcome_status, outcome_notes, next_hearing_date, is_deleted
    await queryInterface.addColumn('case_hearings', 'hearing_number', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    await queryInterface.addColumn('case_hearings', 'previous_hearing_id', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: { model: 'case_hearings', key: 'id' },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });
    await queryInterface.addColumn('case_hearings', 'outcome_status', {
      type: Sequelize.STRING(50),
      allowNull: true
    });
    await queryInterface.addColumn('case_hearings', 'outcome_notes', {
      type: Sequelize.TEXT,
      allowNull: true
    });
    await queryInterface.addColumn('case_hearings', 'next_hearing_date', {
      type: Sequelize.DATEONLY,
      allowNull: true
    });
    await queryInterface.addColumn('case_hearings', 'is_deleted', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
    await queryInterface.addIndex('case_hearings', ['previous_hearing_id'], { name: 'case_hearings_previous_hearing_id_idx' });

    // 6. cases: case_lifecycle_status (Active | Closed | On_Hold | Appeal)
    await queryInterface.addColumn('cases', 'case_lifecycle_status', {
      type: Sequelize.ENUM('Active', 'Closed', 'On_Hold', 'Appeal'),
      allowNull: true
    });
    await queryInterface.sequelize.query(
      "UPDATE cases SET case_lifecycle_status = IF(status = 'CLOSED', 'Closed', 'Active') WHERE case_lifecycle_status IS NULL"
    );
    await queryInterface.changeColumn('cases', 'case_lifecycle_status', {
      type: Sequelize.ENUM('Active', 'Closed', 'On_Hold', 'Appeal'),
      allowNull: false,
      defaultValue: 'Active'
    });

    // Backfill case_assignment_history for existing cases with assigned_to
    const [assignRows] = await queryInterface.sequelize.query(
      `SELECT id, assigned_to, created_at, created_by FROM cases WHERE assigned_to IS NOT NULL`
    );
    for (const row of assignRows) {
      await queryInterface.sequelize.query(
        `INSERT INTO case_assignment_history (case_id, employee_id, assigned_at, assigned_by, reason, created_at, updated_at)
         VALUES (?, ?, ?, ?, NULL, NOW(), NOW())`,
        { replacements: [row.id, row.assigned_to, row.created_at || new Date(), row.created_by] }
      );
    }

    // Backfill case_judge_history for existing cases with judge_id
    const [judgeRows] = await queryInterface.sequelize.query(
      `SELECT id, judge_id, created_at FROM cases WHERE judge_id IS NOT NULL`
    );
    for (const row of judgeRows) {
      await queryInterface.sequelize.query(
        `INSERT INTO case_judge_history (case_id, judge_id, assigned_at, created_at, updated_at)
         VALUES (?, ?, ?, NOW(), NOW())`,
        { replacements: [row.id, row.judge_id, row.created_at || new Date()] }
      );
    }

    // Backfill hearing_number for existing case_hearings (per case)
    const [hearings] = await queryInterface.sequelize.query(
      `SELECT id, case_id, hearing_date FROM case_hearings ORDER BY case_id, hearing_date ASC, id ASC`
    );
    let lastCaseId = null;
    let num = 0;
    for (const h of hearings) {
      if (h.case_id !== lastCaseId) {
        lastCaseId = h.case_id;
        num = 0;
      }
      num += 1;
      await queryInterface.sequelize.query(
        `UPDATE case_hearings SET hearing_number = ? WHERE id = ?`,
        { replacements: [num, h.id] }
      );
    }
  },

  async down(queryInterface) {
    await queryInterface.removeColumn('cases', 'case_lifecycle_status');
    await queryInterface.removeColumn('case_hearings', 'is_deleted');
    await queryInterface.removeColumn('case_hearings', 'next_hearing_date');
    await queryInterface.removeColumn('case_hearings', 'outcome_notes');
    await queryInterface.removeColumn('case_hearings', 'outcome_status');
    await queryInterface.removeColumn('case_hearings', 'previous_hearing_id');
    await queryInterface.removeColumn('case_hearings', 'hearing_number');
    await queryInterface.dropTable('case_judge_history');
    await queryInterface.removeColumn('judges', 'status');
    await queryInterface.dropTable('case_assignment_history');
    await queryInterface.removeColumn('organization_users', 'status');
  }
};
