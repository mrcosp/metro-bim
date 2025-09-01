import cv2
img = cv2.imread("MetroWEB\\Vista3D_1.jpg") 
t_lower = 100
t_upper = 200 
aperture_size = 5
L2Gradient = True 
edge = cv2.Canny(img, t_lower, t_upper, L2gradient = L2Gradient )
cv2.imshow('original', img)
cv2.imshow('edge', edge)
cv2.waitKey(0)
cv2.destroyAllWindows()