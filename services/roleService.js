const Role = require('../models/Role');
const User = require('../models/User');
const { getPaginationOptions, createPaginationResponse } = require('../utils/pagination');

class RoleService {
  // Create new role
  async createRole(roleData) {
    try {
      // Check if role name already exists
      const existingRole = await Role.findOne({ name: roleData.name.toUpperCase() });
      if (existingRole) {
        throw new Error('Role name already exists');
      }

      // Create role
      const role = new Role(roleData);
      await role.save();

      return role;
    } catch (error) {
      throw error;
    }
  }

  // Get all roles with pagination
  async getRoles(query) {
    try {
      const { page, limit, skip, sort } = getPaginationOptions(query);
      
      // Build filter object
      const filter = { isActive: true };
      
      if (query.name) {
        filter.name = { $regex: query.name, $options: 'i' };
      }

      // Execute query
      const [roles, total] = await Promise.all([
        Role.find(filter)
          .sort(sort)
          .skip(skip)
          .limit(limit),
        Role.countDocuments(filter)
      ]);

      // Create pagination response
      const response = createPaginationResponse(roles, total, page, limit);
      
      return response;
    } catch (error) {
      throw error;
    }
  }

  // Get role by ID
  async getRoleById(roleId) {
    try {
      const role = await Role.findById(roleId);
      
      if (!role) {
        throw new Error('Role not found');
      }

      return role;
    } catch (error) {
      throw error;
    }
  }

  // Update role
  async updateRole(roleId, updateData) {
    try {
      // Check if role exists
      const existingRole = await Role.findById(roleId);
      if (!existingRole) {
        throw new Error('Role not found');
      }

      // Check name uniqueness if being updated
      if (updateData.name && updateData.name !== existingRole.name) {
        const nameExists = await Role.findOne({ 
          name: updateData.name.toUpperCase(),
          _id: { $ne: roleId }
        });
        if (nameExists) {
          throw new Error('Role name already exists');
        }
      }

      // Update role
      const updatedRole = await Role.findByIdAndUpdate(
        roleId,
        updateData,
        { new: true, runValidators: true }
      );

      return updatedRole;
    } catch (error) {
      throw error;
    }
  }

  // Delete role
  async deleteRole(roleId) {
    try {
      // Check if role exists
      const existingRole = await Role.findById(roleId);
      if (!existingRole) {
        throw new Error('Role not found');
      }

      // Check if role is assigned to any users
      const usersWithRole = await User.countDocuments({ roleIds: roleId });
      if (usersWithRole > 0) {
        throw new Error('Cannot delete role that is assigned to users');
      }

      // Soft delete by setting isActive to false
      const deletedRole = await Role.findByIdAndUpdate(
        roleId,
        { isActive: false },
        { new: true }
      );

      return { message: 'Role deleted successfully', role: deletedRole };
    } catch (error) {
      throw error;
    }
  }

  // Get role by name
  async getRoleByName(roleName) {
    try {
      const role = await Role.findOne({ 
        name: roleName.toUpperCase(),
        isActive: true 
      });
      
      if (!role) {
        throw new Error('Role not found');
      }

      return role;
    } catch (error) {
      throw error;
    }
  }

  // Get roles with user count
  async getRolesWithUserCount() {
    try {
      const roles = await Role.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'roleIds',
            as: 'users'
          }
        },
        {
          $addFields: {
            userCount: { $size: '$users' }
          }
        },
        {
          $project: {
            users: 0
          }
        }
      ]);

      return roles;
    } catch (error) {
      throw error;
    }
  }

  // Assign permissions to role
  async assignPermissions(roleId, permissions) {
    try {
      // Check if role exists
      const existingRole = await Role.findById(roleId);
      if (!existingRole) {
        throw new Error('Role not found');
      }

      // Update permissions
      const updatedRole = await Role.findByIdAndUpdate(
        roleId,
        { permissions },
        { new: true, runValidators: true }
      );

      return updatedRole;
    } catch (error) {
      throw error;
    }
  }

  // Get role statistics
  async getRoleStats() {
    try {
      const stats = await Role.aggregate([
        {
          $match: { isActive: true }
        },
        {
          $lookup: {
            from: 'users',
            localField: '_id',
            foreignField: 'roleIds',
            as: 'users'
          }
        },
        {
          $addFields: {
            userCount: { $size: '$users' }
          }
        },
        {
          $group: {
            _id: null,
            totalRoles: { $sum: 1 },
            totalUsers: { $sum: '$userCount' },
            avgUsersPerRole: { $avg: '$userCount' }
          }
        }
      ]);

      return stats[0] || { totalRoles: 0, totalUsers: 0, avgUsersPerRole: 0 };
    } catch (error) {
      throw error;
    }
  }

  // Check if role has specific permission
  async roleHasPermission(roleId, permission) {
    try {
      const role = await Role.findById(roleId);
      
      if (!role) {
        throw new Error('Role not found');
      }

      return role.hasPermission(permission);
    } catch (error) {
      throw error;
    }
  }
}

module.exports = new RoleService();
