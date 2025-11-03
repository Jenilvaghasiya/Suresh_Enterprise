export const isValidPhoneNumber = (mobile) => {
    const regex = /^[6-9]\d{9}$/;
    return regex.test(mobile);
}

export const isValidAccountNumber = (accountNum) => {
    const regex = /^\d{9,18}$/;
    return regex.test(accountNum);
}

export const isValidIfscCode = (ifscCode) => {
    const regex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    return regex.test(ifscCode);
}

export const isValidGstNumber = (gstNumber) => {
    const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    return regex.test(gstNumber);
}

export const isHsnCode = (hsnCode) => {
    const regex = /^\d{4}(\d{2})?(\d{2})?$/;
    return regex.test(hsnCode);
}

export const isValidUserName = (name) => {
  const regex = /^[A-Za-z .]+$/;
  return regex.test(name);
};

export const isValidEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};
