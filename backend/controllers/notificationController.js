const { Notification } = require('../models');

// Get recent notifications for authenticated user (e.g. Doctor, Patient, Admin)
const getNotifications = async (req, res, next) => {
  try {
    const recipientId = req.user.id;
    const recipientType = req.user.role;

    const notifications = await Notification.findAll({
      where: {
        recipient_id: recipientId,
        recipient_type: recipientType,
      },
      order: [['created_at', 'DESC']],
      limit: 30,
    });

    const unreadCount = await Notification.count({
      where: {
        recipient_id: recipientId,
        recipient_type: recipientType,
        is_read: false,
      },
    });

    return res.status(200).json({
      success: true,
      unreadCount,
      data: notifications,
    });
  } catch (error) {
    next(error);
  }
};

// Mark all notifications as read for current user
const markAllAsRead = async (req, res, next) => {
  try {
    const recipientId = req.user.id;
    const recipientType = req.user.role;

    const [updatedRows] = await Notification.update(
      { is_read: true },
      {
        where: {
          recipient_id: recipientId,
          recipient_type: recipientType,
          is_read: false,
        },
      }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read.',
      updatedCount: updatedRows,
    });
  } catch (error) {
    next(error);
  }
};

// Mark single notification as read
const markSingleAsRead = async (req, res, next) => {
  try {
    const { id } = req.params;
    const recipientId = req.user.id;
    const recipientType = req.user.role;

    const notification = await Notification.findOne({
      where: {
        id,
        recipient_id: recipientId,
        recipient_type: recipientType,
      },
    });

    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found.' });
    }

    await notification.update({ is_read: true });

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read.',
      data: notification,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getNotifications,
  markAllAsRead,
  markSingleAsRead,
};
