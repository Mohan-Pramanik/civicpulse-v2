exports.success = (res, data = {}, statusCode = 200) => {
  res.status(statusCode).json({ success: true, ...data });
};

exports.paginated = (res, data, total, page, limit) => {
  res.status(200).json({
    success: true,
    total,
    page: Number(page),
    pages: Math.ceil(total / limit),
    count: data.length,
    data
  });
};
