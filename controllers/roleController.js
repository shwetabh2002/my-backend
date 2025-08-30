const roleService = require('../services/roleService');
const { asyncHandler } = require('../middlewares/errorHandler');

class RoleController {
  // Create new role (admin only)
  createRole = asyncHandler(async (req, res) => {
    const roleData = req.body;

    const role = await roleService.createRole(roleData);

    res.status(201).json({
      success: true,
      message: 'Role created successfully',
      data: role
    });
  });

  // Get all roles with pagination
  getRoles = asyncHandler(async (req, res) => {
    const query = req.query;

    const result = await roleService.getRoles(query);

    res.status(200).json({
      success: true,
      message: 'Roles retrieved successfully',
      data: result
    });
  });

  // Get role by ID
  getRoleById = asyncHandler(async (req, res) => {
    const roleId = req.params.id;

    const role = await roleService.getRoleById(roleId);

    res.status(200).json({
      success: true,
      message: 'Role retrieved successfully',
      data: role
    });
  });

  // Update role (admin only)
  updateRole = asyncHandler(async (req, res) => {
    const roleId = req.params.id;
    const updateData = req.body;

    const role = await roleService.updateRole(roleId, updateData);

    res.status(200).json({
      success: true,
      message: 'Role updated successfully',
      data: role
    });
  });

  // Delete role (admin only)
  deleteRole = asyncHandler(async (req, res) => {
    const roleId = req.params.id;

    const result = await roleService.deleteRole(roleId);

    res.status(200).json({
      success: true,
      message: 'Role deleted successfully',
      data: result
    });
  });

  // Get role by name
  getRoleByName = asyncHandler(async (req, res) => {
    const roleName = req.params.name;

    const role = await roleService.getRoleByName(roleName);

    res.status(200).json({
      success: true,
      message: 'Role retrieved successfully',
      data: role
    });
  });

  // Get roles with user count
  getRolesWithUserCount = asyncHandler(async (req, res) => {
    const roles = await roleService.getRolesWithUserCount();

    res.status(200).json({
      success: true,
      message: 'Roles with user count retrieved successfully',
      data: roles
    });
  });

  // Assign permissions to role (admin only)
  assignPermissions = asyncHandler(async (req, res) => {
    const roleId = req.params.id;
    const { permissions } = req.body;

    if (!Array.isArray(permissions) || permissions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Permissions array is required'
      });
    }

    const role = await roleService.assignPermissions(roleId, permissions);

    res.status(200).json({
      success: true,
      message: 'Permissions assigned successfully',
      data: role
    });
  });

  // Get role statistics (admin only)
  getRoleStats = asyncHandler(async (req, res) => {
    const stats = await roleService.getRoleStats();

    res.status(200).json({
      success: true,
      message: 'Role statistics retrieved successfully',
      data: stats
    });
  });

  // Check if role has specific permission
  checkRolePermission = asyncHandler(async (req, res) => {
    const roleId = req.params.id;
    const { permission } = req.query;

    if (!permission) {
      return res.status(400).json({
        success: false,
        message: 'Permission parameter is required'
      });
    }

    const hasPermission = await roleService.roleHasPermission(roleId, permission);

    res.status(200).json({
      success: true,
      message: 'Permission check completed',
      data: {
        roleId,
        permission,
        hasPermission
      }
    });
  });

  // Search roles
  searchRoles = asyncHandler(async (req, res) => {
    const { search } = req.query;

    // Build search query
    const query = {};
    if (search) query.name = search;

    const result = await roleService.getRoles(query);

    res.status(200).json({
      success: true,
      message: 'Roles search completed successfully',
      data: result
    });
  });

  // Bulk create roles (admin only)
  bulkCreateRoles = asyncHandler(async (req, res) => {
    const { roles } = req.body;

    if (!Array.isArray(roles) || roles.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Roles array is required'
      });
    }

    const results = [];
    const errors = [];

    for (const roleData of roles) {
      try {
        const role = await roleService.createRole(roleData);
        results.push(role);
      } catch (error) {
        errors.push({ roleData, error: error.message });
      }
    }

    res.status(201).json({
      success: true,
      message: 'Bulk role creation completed',
      data: {
        created: results,
        errors: errors.length > 0 ? errors : undefined
      }
    });
  });

  // Get role permissions
  getRolePermissions = asyncHandler(async (req, res) => {
    const roleId = req.params.id;

    const role = await roleService.getRoleById(roleId);

    res.status(200).json({
      success: true,
      message: 'Role permissions retrieved successfully',
      data: {
        roleId: role._id,
        name: role.name,
        permissions: role.permissions
      }
    });
  });
}

module.exports = new RoleController();
